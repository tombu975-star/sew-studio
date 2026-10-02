#!/usr/bin/env node
/**
 * Create (or reset) a platform admin.
 *
 *   npm run create-admin -- admin@yourdomain.com "A-strong-password" "Your Name"
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 * (or the environment). Run supabase/0014_system_admin.sql first.
 * Running it again for the same email just resets that admin's password.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The whole job, separated from the command line so it can be tested. */
export async function createSystemAdmin(db, { email, password, fullName }) {
  const emailNorm = String(email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) throw new Error("Please give a valid email address.");
  if (String(password ?? "").length < 8) throw new Error("Use a password of at least 8 characters.");
  const name = String(fullName || "Platform Admin").trim();

  // Find an existing sign-in for this email (first 1000 users is plenty here).
  const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw new Error(`Could not read users: ${listError.message}`);
  let user = (list?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === emailNorm);
  let created = false;

  if (user) {
    // Never turn a studio member or freelancer into an admin: keep the identities separate.
    for (const table of ["profiles", "freelancer_profiles"]) {
      const { data } = await db.from(table).select("id").eq("id", user.id).maybeSingle();
      if (data) {
        throw new Error(
          `${emailNorm} already belongs to a studio member or freelancer. Use a different email for the platform admin.`
        );
      }
    }
    const { error } = await db.auth.admin.updateUserById(user.id, { password: String(password), email_confirm: true });
    if (error) throw new Error(`Could not set the password: ${error.message}`);
  } else {
    const { data, error } = await db.auth.admin.createUser({
      email: emailNorm,
      password: String(password),
      email_confirm: true,
    });
    if (error || !data?.user) throw new Error(`Could not create the sign-in: ${error?.message ?? "unknown error"}`);
    user = data.user;
    created = true;
  }

  const { error: upsertError } = await db
    .from("system_admins")
    .upsert({ id: user.id, email: emailNorm, full_name: name }, { onConflict: "id" });
  if (upsertError) {
    if (created) await db.auth.admin.deleteUser(user.id).catch(() => {});
    const hint = /relation|does not exist|schema cache/i.test(upsertError.message)
      ? " Run supabase/0014_system_admin.sql in the Supabase SQL editor first."
      : "";
    throw new Error(`Could not save the admin record: ${upsertError.message}.${hint}`);
  }
  return { id: user.id, email: emailNorm, fullName: name, created };
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, ".env"));
  const [email, password, ...rest] = process.argv.slice(2);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!email || !password) {
    console.error('Usage: npm run create-admin -- <email> <password> ["Full Name"]');
    process.exit(1);
  }
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (set them in .env.local).");
    process.exit(1);
  }
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  createSystemAdmin(db, { email, password, fullName: rest.join(" ") })
    .then((r) => {
      console.log(`${r.created ? "Created" : "Updated"} platform admin ${r.email}.`);
      console.log("Sign in at /admin with that email and the password you just set.");
    })
    .catch((e) => {
      console.error("Failed:", e.message);
      process.exit(1);
    });
}
