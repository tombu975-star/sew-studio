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

/**
 * Works out exactly why an admin can't sign in. `admin` is a service-role
 * client, `anon` a normal (public key) client — the same kind the login page uses.
 */
export async function checkSystemAdmin(admin, anon, { email, password }) {
  const emailNorm = String(email ?? "").trim().toLowerCase();
  const steps = [];
  const add = (ok, label, detail) => steps.push({ ok, label, detail: detail ?? "" });

  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    add(false, "Reach Supabase with the service key", listError.message + " — check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    return { ok: false, steps };
  }
  add(true, "Reach Supabase with the service key");

  const user = (list?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === emailNorm);
  if (!user) {
    add(false, `A sign-in exists for ${emailNorm}`, "None in this Supabase project. Run: npm run create-admin -- <email> <password> \"Your Name\"");
    return { ok: false, steps };
  }
  add(true, `A sign-in exists for ${emailNorm}`);

  if (!user.email_confirmed_at) {
    add(false, "The email is confirmed", "Not confirmed, so password sign-in is refused. Run npm run create-admin again for this email (it confirms it).");
  } else add(true, "The email is confirmed");

  const { error: signInError } = await anon.auth.signInWithPassword({ email: emailNorm, password: String(password) });
  if (signInError) {
    add(false, "The password is accepted", `${signInError.code || "error"}: ${signInError.message}. Reset it with: npm run create-admin -- ${emailNorm} <new-password>`);
  } else {
    add(true, "The password is accepted");
    await anon.auth.signOut().catch(() => {});
  }

  const { data: row, error: rowError } = await admin.from("system_admins").select("id").eq("id", user.id).maybeSingle();
  if (rowError) {
    add(false, "The system_admins table is set up", rowError.message + " — run supabase/0014_system_admin.sql.");
  } else if (!row) {
    add(false, "The account is marked as a platform admin", "Signed-in user is not in system_admins. Run: npm run create-admin -- <email> <password>");
  } else add(true, "The account is marked as a platform admin");

  return { ok: steps.every((x) => x.ok), steps };
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
  const args = process.argv.slice(2);
  const checking = args[0] === "--check";
  const [email, password, ...rest] = checking ? args.slice(1) : args;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!email || !password) {
    console.error('Usage:\n  npm run create-admin -- <email> <password> ["Full Name"]\n  npm run create-admin -- --check <email> <password>');
    process.exit(1);
  }
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (set them in .env.local).");
    process.exit(1);
  }
  // Compare this with the URL your deployed site uses — a mismatch is the most common cause.
  console.log(`Supabase project: ${new URL(url).host}`);
  const opts = { auth: { autoRefreshToken: false, persistSession: false } };
  const db = createClient(url, key, opts);

  if (checking) {
    if (!anonKey) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY (set it in .env.local).");
      process.exit(1);
    }
    checkSystemAdmin(db, createClient(url, anonKey, opts), { email, password })
      .then((r) => {
        for (const st of r.steps) console.log(`${st.ok ? "  OK " : " FAIL"}  ${st.label}${st.ok ? "" : "\n        → " + st.detail}`);
        console.log(r.ok ? "\nEverything checks out — sign in at /admin." : "\nFix the first FAIL above, then run this check again.");
        process.exit(r.ok ? 0 : 2);
      })
      .catch((e) => { console.error("Failed:", e.message); process.exit(1); });
  } else {
    createSystemAdmin(db, { email, password, fullName: rest.join(" ") })
      .then((r) => {
        console.log(`${r.created ? "Created" : "Updated"} platform admin ${r.email}.`);
        console.log("Sign in at /admin with that email and the password you just set.");
        console.log("Not working? Run: npm run create-admin -- --check <email> <password>");
      })
      .catch((e) => { console.error("Failed:", e.message); process.exit(1); });
  }
}
