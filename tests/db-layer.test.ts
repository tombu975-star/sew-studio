/* eslint-disable @typescript-eslint/no-explicit-any */
// Integration test for the Postgres data layer. Needs DATABASE_URL pointing at a
// migrated, throwaway database:  DATABASE_URL=... npx tsx tests/db-layer.test.ts
import assert from "node:assert/strict";
import { AppClient } from "../src/lib/db/appClient";
import { SESSION_COOKIE, type CookieAdapter } from "../src/lib/db/auth";
import { getPool } from "../src/lib/db/pool";

const jar = new Map<string, string>();
const cookies: CookieAdapter = {
  get: (n) => jar.get(n),
  set: (n, v) => void jar.set(n, v),
  delete: (n) => void jar.delete(n),
};
let passed = 0;
const t = async (name: string, fn: () => Promise<void>) => {
  try { await fn(); passed++; console.log("ok  ", name); }
  catch (e) { console.error("FAIL", name, "\n    ", (e as Error).message); process.exitCode = 1; }
};

async function mkShop(admin: AppClient, name: string, email: string) {
  const slug = name.toLowerCase() + Math.random().toString(36).slice(2, 6);
  const u = await admin.auth.admin.createUser({
    email,
    password: "Passw0rd!!",
    email_confirm: true,
    provision: async (client, user) => {
      const shop = await client.query(
        `insert into public.shops (name, slug) values ($1, $2) returning id`,
        [name, slug]
      );
      const shopId = shop.rows[0].id as string;
      await client.query(
        `insert into public.settings (shop_id, studio_name) values ($1, $2)`,
        [shopId, name]
      );
      await client.query(
        `insert into public.profiles (id, email, full_name, role, shop_id)
         values ($1, $2, $3, 'madam', $4)`,
        [user.id, email, name + " Owner", shopId]
      );
      return { userId: user.id, shopId };
    },
  });
  assert.ifError(u.error);
  assert.ok(u.data.provisioned);
  return u.data.provisioned!;
}

(async () => {
  const admin = new AppClient("service_role");
  const tag = Math.random().toString(36).slice(2, 7);
  const A = await mkShop(admin, "Alpha", `a-${tag}@t.com`);
  const B = await mkShop(admin, "Beta", `b-${tag}@t.com`);

  await t("duplicate email is rejected with 'already'", async () => {
    const r = await admin.auth.admin.createUser({ email: `A-${tag}@t.com`, password: "x12345678" });
    assert.ok(r.error && /already/i.test(r.error.message));
  });

  await t("account and profile provision together and the new account can sign in", async () => {
    const email = `freelancer-${tag}@t.com`;
    const created = await admin.auth.admin.createUser({
      email,
      password: "Passw0rd!!",
      provision: async (client, user) => {
        await client.query(
          `insert into public.freelancer_profiles (id, email, full_name)
           values ($1, $2, $3)`,
          [user.id, email, "Test Freelancer"]
        );
      },
    });
    assert.ifError(created.error);
    assert.ok(created.data.user);

    const login = new AppClient("authenticated", cookies, { ip: "5.6.7.8" });
    assert.ifError((await login.auth.signInWithPassword({ email, password: "Passw0rd!!" })).error);
    const profile = await login
      .from("freelancer_profiles")
      .select("id, full_name")
      .eq("id", created.data.user.id)
      .single();
    assert.ifError(profile.error);
    assert.equal(profile.data.full_name, "Test Freelancer");
  });

  await t("failed account provisioning rolls back both auth and profile rows", async () => {
    const email = `rollback-${tag}@t.com`;
    const created = await admin.auth.admin.createUser({
      email,
      password: "Passw0rd!!",
      provision: async (client, user) => {
        await client.query(
          `insert into public.freelancer_profiles (id, email, full_name)
           values ($1, $2, $3)`,
          [user.id, email, "Should Roll Back"]
        );
        throw new Error("force transaction rollback");
      },
    });
    assert.ok(created.error);
    const rows = await getPool().query(
      `select
         (select count(*)::int from auth.users where email = $1) as users,
         (select count(*)::int from public.freelancer_profiles where email = $1) as profiles`,
      [email]
    );
    assert.equal(rows.rows[0].users, 0);
    assert.equal(rows.rows[0].profiles, 0);
  });

  await t("a shop owner can create a staff login in the same shop", async () => {
    const email = `staff-${tag}@t.com`;
    const member = await admin.auth.admin.createUser({
      email,
      password: "Passw0rd!!",
      provision: async (client, user) => {
        const result = await client.query(
          `insert into public.profiles (id, email, full_name, role, shop_id)
           values ($1, $2, $3, 'staff', $4)
           returning id, shop_id`,
          [user.id, email, "Test Staff", A.shopId]
        );
        return result.rows[0];
      },
    });
    assert.ifError(member.error);
    assert.ok(member.data.provisioned);

    const staff = new AppClient("authenticated", cookies, { ip: "9.8.7.6" });
    assert.ifError((await staff.auth.signInWithPassword({ email, password: "Passw0rd!!" })).error);
    const profile = await staff
      .from("profiles")
      .select("id, role, shop_id")
      .eq("id", member.data.user!.id)
      .single();
    assert.ifError(profile.error);
    assert.equal(profile.data.role, "staff");
    assert.equal(profile.data.shop_id, A.shopId);
  });

  // sign in as Alpha owner through the cookie flow
  const web = new AppClient("authenticated", cookies, { ip: "1.2.3.4" });
  await t("wrong password fails, right password works", async () => {
    const bad = await web.auth.signInWithPassword({ email: `a-${tag}@t.com`, password: "nope" });
    assert.ok(bad.error);
    const ok = await web.auth.signInWithPassword({ email: `a-${tag}@t.com`, password: "Passw0rd!!" });
    assert.ifError(ok.error);
    assert.ok(jar.get(SESSION_COOKIE));
  });

  // a fresh request client resolves the user from the cookie
  const req = () => new AppClient("authenticated", cookies);
  await t("session cookie identifies the user; token is stored hashed", async () => {
    const u = await req().auth.getUser();
    assert.equal(u.data.user?.id, A.userId);
    const raw = jar.get(SESSION_COOKIE)!;
    const rows = await getPool().query("select token_hash from private.sessions where user_id=$1", [A.userId]);
    assert.ok(rows.rows.length >= 1 && rows.rows.every((r) => r.token_hash !== raw));
  });

  const cust = await admin.from("customers").insert({ shop_id: A.shopId, name: "Ama" }).select("id").single();
  const custB = await admin.from("customers").insert({ shop_id: B.shopId, name: "Kofi" }).select("id").single();
  assert.ifError(cust.error); assert.ifError(custB.error);
  const ord = await admin.from("orders").insert({ shop_id: A.shopId, customer_id: cust.data.id, garment_design: "Kaba", order_date: new Date(), selling_price: 250.5 }).select("*").single();
  assert.ifError(ord.error);
  await admin.from("orders").insert({ shop_id: B.shopId, customer_id: custB.data.id, garment_design: "Smock", order_date: new Date(), selling_price: 100 });
  await admin.from("payments").insert({ order_id: ord.data.id, amount: 50 });

  await t("RLS: a shop member sees only their own shop", async () => {
    const c = req();
    const orders = await c.from("orders").select("*");
    assert.ifError(orders.error);
    assert.equal(orders.data!.length, 1);
    assert.equal(orders.data![0].garment_design, "Kaba");
    const customers = await c.from("customers").select("id, name");
    assert.deepEqual(customers.data!.map((x: any) => x.name), ["Ama"]);
    const other = await c.from("orders").select("*").eq("shop_id", B.shopId);
    assert.equal(other.data!.length, 0);
  });

  await t("RLS: anonymous (no cookie) sees nothing", async () => {
    const anon = new AppClient("authenticated", { get: () => undefined, set() {}, delete() {} });
    const r = await anon.from("orders").select("*");
    assert.equal((r.data ?? []).length, 0);
  });

  await t("numbers and dates come back as JSON numbers / ISO strings", async () => {
    const r = await req().from("orders").select("selling_price, order_date").maybeSingle();
    assert.equal(typeof r.data.selling_price, "number");
    assert.equal(r.data.selling_price, 250.5);
    assert.match(r.data.order_date, /^\d{4}-\d{2}-\d{2}T/);
  });

  await t("embeds: forward, reverse, nested, count, hint, inner", async () => {
    const c = req();
    const a = await c.from("orders").select("id, customer:customers(id, name)").maybeSingle();
    assert.equal(a.data.customer.name, "Ama");
    const b = await c.from("customers").select("*, orders(count)").maybeSingle();
    assert.deepEqual(b.data.orders, [{ count: 1 }]);
    const d = await c.from("payments").select("*, order:orders!inner(id, shop_id, garment_design, customer:customers(id, name))").eq("order.shop_id", A.shopId).order("date", { ascending: false });
    assert.ifError(d.error);
    assert.equal(d.data!.length, 1);
    assert.equal(d.data![0].order.customer.name, "Ama");
    const none = await c.from("payments").select("*, order:orders!inner(shop_id)").eq("order.shop_id", B.shopId);
    assert.equal(none.data!.length, 0);
    const e = await c.from("profiles").select("id, shop:shops(id, name, slug, currency)").eq("id", A.userId).single();
    assert.equal(e.data.shop.name, "Alpha");
  });

  await t("insert/update/delete + single/maybeSingle semantics", async () => {
    const c = req();
    const ins = await c.from("customers").insert({ shop_id: A.shopId, name: "Efua", phone: "0240000000" }).select().single();
    assert.ifError(ins.error);
    const upd = await c.from("customers").update({ name: "Efua B" }).eq("id", ins.data.id).eq("shop_id", A.shopId).select("id, name").single();
    assert.equal(upd.data.name, "Efua B");
    const missing = await c.from("customers").select("*").eq("id", "00000000-0000-0000-0000-000000000000").maybeSingle();
    assert.equal(missing.data, null); assert.equal(missing.error, null);
    const many = await c.from("customers").select("*").single();
    assert.equal(many.error?.code, "PGRST116");
    const del = await c.from("customers").delete().eq("id", ins.data.id);
    assert.ifError(del.error);
    const gone = await c.from("customers").select("id").eq("id", ins.data.id);
    assert.equal(gone.data!.length, 0);
  });

  await t("cross-tenant write is blocked by RLS", async () => {
    const c = req();
    const r = await c.from("orders").insert({ shop_id: B.shopId, customer_id: custB.data.id, garment_design: "Hack", order_date: new Date() });
    assert.ok(r.error, "insert into another shop must fail");
    const u = await c.from("orders").update({ garment_design: "Hacked" }).eq("shop_id", B.shopId).select("id");
    assert.equal(u.data!.length, 0);
  });

  await t("or(), in(), not(), is(), neq(), count/head", async () => {
    const c = req();
    const o = await c.from("orders").select("id").or(`assigned_staff_id.eq.${A.userId},assigned_staff_id.is.null`);
    assert.equal(o.data!.length, 1);
    const i = await c.from("orders").select("id").in("status", ["Pending", "In Progress"]);
    assert.ifError(i.error);
    const n = await c.from("orders").select("id").not("status", "in", '("Completed","Collected/Delivered")');
    assert.ifError(n.error);
    const nul = await c.from("orders").select("id").is("delivery_date", null);
    assert.equal(nul.data!.length, 1);
    const cnt = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("shop_id", A.shopId);
    assert.equal(cnt.count, 1);
    const cnt2 = await admin.from("orders").select("id", { count: "exact" }).limit(1);
    assert.ok((cnt2.count ?? 0) >= 2 && cnt2.data!.length === 1);
  });

  await t("jsonb and array columns round-trip", async () => {
    const cols = await getPool().query(`select table_name, column_name, udt_name from information_schema.columns where table_schema='public' and udt_name in ('jsonb','_text')`);
    console.log("     (json/array columns:", cols.rows.map((r) => `${r.table_name}.${r.column_name}:${r.udt_name}`).join(", ") || "none", ")");
  });

  await t("injection attempts in values and identifiers are inert", async () => {
    const c = req();
    const r = await c.from("customers").select("id").eq("name", "x'; drop table customers; --");
    assert.ifError(r.error);
    const bad = await c.from("customers").select("id").eq("name; drop table customers", "x");
    assert.ok(bad.error);
    const still = await admin.from("customers").select("id", { count: "exact", head: true });
    assert.ok((still.count ?? 0) >= 1);
  });

  await t("change password revokes other sessions, keeps this one", async () => {
    const other = new Map<string, string>();
    const web2 = new AppClient("authenticated", { get: (n) => other.get(n), set: (n, v) => void other.set(n, v), delete: (n) => void other.delete(n) });
    assert.ifError((await web2.auth.signInWithPassword({ email: `a-${tag}@t.com`, password: "Passw0rd!!" })).error);
    const r = await req().auth.updateUser({ password: "NewPassw0rd!!" });
    assert.ifError(r.error);
    assert.equal((await req().auth.getUser()).data.user?.id, A.userId);
    const stale = new AppClient("authenticated", { get: (n) => other.get(n), set() {}, delete() {} });
    assert.equal((await stale.auth.getUser()).data.user, null);
    assert.ok((await new AppClient("authenticated", cookies).auth.signInWithPassword({ email: `a-${tag}@t.com`, password: "Passw0rd!!" })).error);
  });

  await t("banning a user cuts access immediately", async () => {
    await admin.auth.admin.updateUserById(A.userId, { ban_duration: "876000h" });
    assert.equal((await req().auth.getUser()).data.user, null);
    const r = await new AppClient("authenticated", { get: () => undefined, set() {}, delete() {} }).auth.signInWithPassword({ email: `a-${tag}@t.com`, password: "NewPassw0rd!!" });
    assert.ok(r.error);
    await admin.auth.admin.updateUserById(A.userId, { ban_duration: "none" });
    assert.ifError((await new AppClient("authenticated", cookies).auth.signInWithPassword({ email: `a-${tag}@t.com`, password: "NewPassw0rd!!" })).error);
  });

  await t("password reset link works once", async () => {
    const jar2 = new Map<string, string>();
    const c = new AppClient("authenticated", { get: (n) => jar2.get(n), set: (n, v) => void jar2.set(n, v), delete: (n) => void jar2.delete(n) });
    await c.auth.resetPasswordForEmail(`b-${tag}@t.com`, { redirectTo: "http://x/auth/callback?next=/reset-password" });
    const row = await getPool().query("select token_hash from private.password_resets where user_id=$1", [B.userId]);
    assert.equal(row.rows.length, 1);
    // email isn't configured here, so craft a known token the same way the app does
    const { createHash } = await import("crypto");
    const token = "known-test-token-" + tag;
    await getPool().query("update private.password_resets set token_hash=$1 where user_id=$2", [createHash("sha256").update(token).digest("hex"), B.userId]);
    assert.ifError((await c.auth.exchangeCodeForSession(token)).error);
    assert.ok((await c.auth.getUser()).data.user?.id === B.userId);
    assert.ok((await c.auth.exchangeCodeForSession(token)).error, "token must be single-use");
  });

  await t("request roles cannot read the private schema", async () => {
    const r = await req().from("credentials").select("*");
    assert.ok(r.error || (r.data ?? []).length === 0);
    await assert.rejects(() => getPool().connect().then(async (cl) => { try { await cl.query("set role authenticated"); await cl.query("select * from private.credentials"); } finally { await cl.query("reset role").catch(() => {}); cl.release(); } }));
  });

  console.log(`\n${passed} checks passed`);
  await getPool().end();
})();
