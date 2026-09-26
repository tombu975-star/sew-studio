/**
 * scripts/init-supabase-essential.ts
 *
 * Idempotent demo-data bootstrap for a Supabase project. Creates (or
 * updates, if run again) the essential baseline records directly via
 * @supabase/supabase-js — no Prisma involved:
 *  - Default Shop tenant ("Madam Studio") + Settings
 *  - Essential Supabase Auth users + profiles:
 *      * Owner / Madam (madam@studio.com)
 *      * Senior Staff (staff@studio.com), Cutters (yaw@, esi@studio.com)
 *      * Trainer / Mentor (trainer@studio.com)
 *      * Trainees (trainee@, kojo@studio.com) — linked to the trainer,
 *        with training duration + start date set
 *      * Freelancer (freelancer@studio.com) — a separate identity space
 *        (freelancer_profiles, not profiles), linked to this shop
 *  - A baseline Training Program with two competency units
 *
 * All demo accounts use the password "atelier2025" (freelancer:
 * "atelier2025" too) unless already set otherwise.
 *
 * Usage: npx tsx scripts/init-supabase-essential.ts
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
 * .env.local (Next.js's own convention for local secrets) or .env
 * (or the shell environment).
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load .env then .env.local, same precedence Next.js itself uses:
// shell env > .env.local > .env. Both are optional; whichever exist
// are merged, with .env.local's values taking priority over .env's.
const fileValues: Record<string, string> = {};
for (const file of [".env", ".env.local"]) {
  const envPath = path.join(__dirname, "..", file);
  if (fs.existsSync(envPath)) {
    Object.assign(fileValues, dotenv.parse(fs.readFileSync(envPath)));
  }
}
for (const k in fileValues) {
  if (!process.env[k]) process.env[k] = fileValues[k];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (check your .env.local or .env)."
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Create the auth user if this email doesn't have one yet, else return its id. */
async function upsertAuthUser(email: string, password: string): Promise<string> {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (!error && created.user) return created.user.id;

  // Already exists — look it up (paginate defensively; fine for a small demo project).
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) throw error ?? new Error(`Could not find or create auth user for ${email}`);
  return existing.id;
}

async function main() {
  console.log("---------------------------------------------------------");
  console.log("🚀 Running Supabase Essential Seed Initialization...");
  console.log("---------------------------------------------------------");
  console.log(`📡 Target project: ${SUPABASE_URL}`);

  // 1. Essential Shop tenant (find-or-create by slug).
  const defaultSlug = "madam-studio";
  let { data: shop } = await admin.from("shops").select("*").eq("slug", defaultSlug).maybeSingle();
  if (!shop) {
    console.log('Creating baseline shop tenant: "Madam Studio"...');
    const { data: created, error } = await admin
      .from("shops")
      .insert({ name: "Madam Studio", slug: defaultSlug, plan: "pro", currency: "GHS" })
      .select("*")
      .single();
    if (error) throw error;
    shop = created;
  } else {
    console.log(`Existing shop tenant found: "${shop.name}" (${shop.id})`);
  }
  const shopId = shop!.id;

  // 2. Settings.
  const { data: existingSettings } = await admin
    .from("settings")
    .select("id")
    .eq("shop_id", shopId)
    .maybeSingle();
  if (!existingSettings) {
    await admin.from("settings").insert({
      shop_id: shopId,
      owner_gender: "Madam",
      studio_name: "Madam Studio",
      overhead_amount: 3500,
      self_payout: 2000,
      currency: "GHS",
    });
    console.log("Initialized studio settings.");
  }

  // 3. Essential users (shop members).
  const ESSENTIAL_USERS = [
    { email: "madam@studio.com", fullName: "Madam Adwoa", role: "madam", gender: "Female", phone: "+233 24 000 0001", canAccessOrders: true, canAccessBoard: true },
    { email: "staff@studio.com", fullName: "Akos Mansa", role: "staff", gender: "Female", phone: "+233 24 000 0002", canAccessOrders: true, canAccessBoard: true },
    { email: "yaw@studio.com", fullName: "Yaw Kofi", role: "staff", gender: "Male", phone: "+233 24 000 0003", canAccessOrders: true, canAccessBoard: true },
    { email: "esi@studio.com", fullName: "Esi Boatema", role: "staff", gender: "Female", phone: "+233 24 000 0004", canAccessOrders: true, canAccessBoard: true },
    { email: "trainer@studio.com", fullName: "Coach Afia", role: "trainer", gender: "Female", phone: "+233 24 000 0005", canAccessOrders: true, canAccessBoard: true },
    { email: "trainee@studio.com", fullName: "Ama Trainee", role: "trainee", gender: "Female", phone: "+233 24 000 0006", canAccessOrders: false, canAccessBoard: false },
    { email: "kojo@studio.com", fullName: "Kojo Trainee", role: "trainee", gender: "Male", phone: "+233 24 000 0007", canAccessOrders: true, canAccessBoard: true },
  ] as const;

  console.log(`Ensuring ${ESSENTIAL_USERS.length} essential users & roles...`);
  const createdUsers: Record<string, { id: string }> = {};
  for (const u of ESSENTIAL_USERS) {
    const userId = await upsertAuthUser(u.email, "atelier2025");
    const { data: profile, error } = await admin
      .from("profiles")
      .upsert(
        {
          id: userId,
          shop_id: shopId,
          email: u.email,
          full_name: u.fullName,
          role: u.role,
          gender: u.gender,
          phone: u.phone,
          can_access_orders: u.canAccessOrders,
          can_access_board: u.canAccessBoard,
        },
        { onConflict: "id" }
      )
      .select("id")
      .single();
    if (error) throw error;
    createdUsers[u.email] = profile;
    console.log(
      `  - [Role: ${u.role.padEnd(7)}] ${u.fullName} <${u.email}> (Orders: ${u.canAccessOrders ? "✓" : "✗"}, Board: ${u.canAccessBoard ? "✓" : "✗"})`
    );
  }

  // 4. Connect trainees to their mentor.
  const trainer = createdUsers["trainer@studio.com"];
  if (trainer) {
    const trainees = [createdUsers["trainee@studio.com"], createdUsers["kojo@studio.com"]];
    for (let i = 0; i < trainees.length; i++) {
      if (!trainees[i]) continue;
      await admin
        .from("profiles")
        .update({
          mentor_id: trainer.id,
          training_duration_weeks: 12,
          training_started_at: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 7 * (8 - i * 2)
          ).toISOString(),
        })
        .eq("id", trainees[i].id);
    }
    console.log("Linked trainees with mentor Coach Afia.");
  }

  // 5. Baseline training program + competency units.
  const madam = createdUsers["madam@studio.com"];
  const { data: existingProgram } = await admin
    .from("training_programs")
    .select("id, name")
    .eq("shop_id", shopId)
    .maybeSingle();
  if (!existingProgram && madam) {
    const { data: program, error } = await admin
      .from("training_programs")
      .insert({
        shop_id: shopId,
        name: "Bespoke Tailoring & Haute Couture Apprenticeship",
        level: "NVTI Grade II / Intermediate",
        duration_weeks: 12,
        description:
          "Comprehensive bespoke garment construction, pattern drafting, fitting, and luxury hand finishing.",
        created_by_id: madam.id,
      })
      .select("*")
      .single();
    if (error) throw error;

    await admin.from("competency_units").insert([
      {
        shop_id: shopId,
        program_id: program.id,
        code: "CU-01",
        title: "Pattern Drafting & Body Measurement Mastery",
        learning_outcomes: "Master accurate anthropometric measurements and draft master slopers.",
        assessment_criteria: "Zero-tolerance measurement fitting on live model within 0.5cm.",
        nominal_hours: 40,
        order_index: 0,
      },
      {
        shop_id: shopId,
        program_id: program.id,
        code: "CU-02",
        title: "Luxury Fabric Handling & Kente Grain Alignment",
        learning_outcomes: "Cut and match geometric patterns across woven African kente and silks.",
        assessment_criteria: "Clean seam alignment along weft lines and dart placement.",
        nominal_hours: 60,
        order_index: 1,
      },
    ]);
    console.log(`Created baseline training curriculum: "${program.name}"`);
  }

  // 6. Freelancer identity (separate auth/profile space) + shop link.
  const freelancerEmail = "freelancer@studio.com";
  const freelancerId = await upsertAuthUser(freelancerEmail, "atelier2025");
  const { data: freelancer, error: freelancerError } = await admin
    .from("freelancer_profiles")
    .upsert(
      {
        id: freelancerId,
        email: freelancerEmail,
        full_name: "Mama Esi Beadworks",
        phone: "+233 24 111 2233",
        specialty: "Hand Beading & Embellishments",
        skills: "Pearl setting, crystal embroidery, bodice boning",
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();
  if (freelancerError) throw freelancerError;

  await admin.from("freelancer_shop_links").upsert(
    {
      shop_id: shopId,
      freelancer_id: freelancer.id,
      status: "Available",
      rate_notes: "GHS 400 - Fast turnaround on bodice beading",
    },
    { onConflict: "shop_id,freelancer_id" }
  );
  console.log(`Initialized external Freelancer role: ${freelancer.full_name} <${freelancer.email}>`);

  // 7. Summary.
  const [usersCount, customersCount, ordersCount, tasksCount] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("shop_id", shopId),
    admin.from("customers").select("id", { count: "exact", head: true }).eq("shop_id", shopId),
    admin.from("orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId),
    admin.from("tasks").select("id", { count: "exact", head: true }).eq("shop_id", shopId),
  ]);

  console.log("---------------------------------------------------------");
  console.log("✨ Initialization completed successfully!");
  console.log(`- Shop: "${shop!.name}" (${shopId})`);
  console.log(`- Users in Shop: ${usersCount.count ?? 0}`);
  console.log(`- Customers: ${customersCount.count ?? 0}`);
  console.log(`- Orders: ${ordersCount.count ?? 0}`);
  console.log(`- Tasks: ${tasksCount.count ?? 0}`);
  console.log("---------------------------------------------------------");
  console.log("Log in at /  with madam@studio.com / atelier2025 (or any account above).");
}

main().catch((err) => {
  console.error("❌ Seed script failed:", err);
  process.exit(1);
});
