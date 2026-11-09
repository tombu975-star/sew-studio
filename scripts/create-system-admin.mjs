#!/usr/bin/env node
/**
 * Create (or reset) a platform admin.
 *
 *   npm run create-admin -- admin@yourdomain.com "A-strong-password" "Your Name"
 *   npm run create-admin -- --check admin@yourdomain.com "the-password"
 *
 * Uses DATABASE_URL (from the environment or .env.local). Run `npm run db:migrate`
 * first. Running it again for the same email just resets that admin's password.
 * To run it against Railway from your machine: `railway run npm run create-admin -- ...`
 */
import { hash, verify } from "@node-rs/argon2";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { fileURLToPath } from "node:url";

/** The whole job, separated from the command line so it can be tested. */
export async function createSystemAdmin(db, { email, password, fullName }) {
  const emailNorm = String(email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) throw new Error("Please give a valid email address.");
  if (String(password ?? "").length < 8) throw new Error("Use a password of at least 8 characters.");
  const name = String(fullName || "Platform Admin").trim();
  const passwordHash = await hash(String(password));

  await db.query("begin");
  try {
    let created = false;
    let { rows } = await db.query("select id from auth.users where lower(email) = $1", [emailNorm]);
    let id = rows[0]?.id;
    if (id) {
      // Never turn a studio member or freelancer into an admin: keep the identities separate.
      for (const table of ["profiles", "freelancer_profiles"]) {
        const r = await db.query(`select 1 from public.${table} where id = $1`, [id]);
        if (r.rowCount) {
          throw new Error(`${emailNorm} already belongs to a studio member or freelancer. Use a different email for the platform admin.`);
        }
      }
      await db.query(
        `insert into private.credentials (user_id, password_hash) values ($1, $2)
           on conflict (user_id) do update set password_hash = excluded.password_hash, updated_at = now()`,
        [id, passwordHash]
      );
      await db.query("update auth.users set banned_until = null where id = $1", [id]);
    } else {
      id = (await db.query("insert into auth.users (email) values ($1) returning id", [emailNorm])).rows[0].id;
      await db.query("insert into private.credentials (user_id, password_hash) values ($1, $2)", [id, passwordHash]);
      created = true;
    }
    await db.query(
      `insert into public.system_admins (id, email, full_name) values ($1, $2, $3)
         on conflict (id) do update set email = excluded.email, full_name = excluded.full_name`,
      [id, emailNorm, name]
    );
    await db.query("commit");
    return { id, email: emailNorm, fullName: name, created };
  } catch (e) {
    await db.query("rollback").catch(() => {});
    throw e;
  }
}

/** Works out exactly why an admin can't sign in. */
export async function checkSystemAdmin(db, { email, password }) {
  const emailNorm = String(email ?? "").trim().toLowerCase();
  const steps = [];
  const add = (ok, label, detail) => steps.push({ ok, label, detail: detail ?? "" });
  const { rows } = await db.query(
    `select u.id, u.banned_until, c.password_hash from auth.users u
       left join private.credentials c on c.user_id = u.id where lower(u.email) = $1`,
    [emailNorm]
  );
  const u = rows[0];
  if (!u) {
    add(false, `A sign-in exists for ${emailNorm}`, 'None found. Run: npm run create-admin -- <email> <password> "Your Name"');
    return { ok: false, steps };
  }
  add(true, `A sign-in exists for ${emailNorm}`);
  add(!(u.banned_until && new Date(u.banned_until) > new Date()), "The account is active");
  const okPw = u.password_hash ? await verify(u.password_hash, String(password)).catch(() => false) : false;
  add(okPw, "The password is accepted", okPw ? "" : `Reset it with: npm run create-admin -- ${emailNorm} <new-password>`);
  const a = await db.query("select 1 from public.system_admins where id = $1", [u.id]);
  add(a.rowCount > 0, "The account is marked as a platform admin", a.rowCount ? "" : "Run: npm run create-admin -- <email> <password>");
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
  if (!email || !password) {
    console.error('Usage:\n  npm run create-admin -- <email> <password> ["Full Name"]\n  npm run create-admin -- --check <email> <password>');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    if (checking) {
      const r = await checkSystemAdmin(db, { email, password });
      for (const s of r.steps) console.log(`${s.ok ? "OK  " : "FAIL"} ${s.label}${s.detail ? " - " + s.detail : ""}`);
      process.exitCode = r.ok ? 0 : 1;
    } else {
      const r = await createSystemAdmin(db, { email, password, fullName: rest.join(" ") });
      console.log(`${r.created ? "Created" : "Updated"} platform admin ${r.email}`);
    }
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}
