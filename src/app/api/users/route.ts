import { getTenant } from "@/lib/db/session";
import { serializeUser } from "@/lib/db/serializers";
import { createAdminClient } from "@/lib/db/adminClient";
import { getPool } from "@/lib/db/pool";
import type { PoolClient } from "pg";
import { findIdentityConflict, identityErrorMessage, isPlausiblePhone, MESSAGES } from "@/lib/identity";
import { getPlanEntitlements } from "@/lib/plans";
import { MIN_PASSWORD_LENGTH, PASSWORD_TOO_SHORT, generateTempPassword } from "@/lib/security";

export async function GET() {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // RLS already scopes this to ctx.shopId — the explicit .eq is defense
    // in depth, matching the app's existing convention of never relying on
    // a single layer for tenant isolation.
    const columns = "id, email, full_name, role, gender, phone, avatar_url, shop_id, mentor_id, training_duration_weeks, training_started_at, program_id, can_access_orders, can_access_board, can_manage_freelancers, created_at, updated_at";
    const listMembers = (activeOnly: boolean) => {
      let q = ctx.db.from("profiles").select(columns).eq("shop_id", ctx.shopId);
      if (activeOnly) q = q.eq("is_active", true);
      return q.order("created_at", { ascending: true });
    };
    // Hide removed members; if migration 0012 isn't applied yet, list everyone.
    let { data: users, error } = await listMembers(true);
    if (error) ({ data: users, error } = await listMembers(false));
    if (error || !users) throw error ?? new Error("Could not load team");

    return Response.json(users.map(serializeUser));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// Invite a new studio member (staff / trainer / trainee / madam). Creates
// their sign-in (admin API — this is an admin action on someone
// else's behalf, not a self-signup) then their profile.
export async function POST(req: Request) {
  const admin = createAdminClient();
  let createdAuthUserId: string | null = null;

  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (ctx.role !== "madam" && ctx.role !== "trainer") {
      return Response.json(
        { error: "Only the studio owner or a trainer can add members." },
        { status: 403 }
      );
    }

    const { rows: planRows } = await getPool().query(
      `select s.plan, s.trial_ends_at,
              (select count(*)::int from public.profiles p
                where p.shop_id = s.id and p.is_active = true) as member_count
         from public.shops s
        where s.id = $1`,
      [ctx.shopId]
    );
    const shopPlan = planRows[0];
    if (!shopPlan) return Response.json({ error: "Studio not found." }, { status: 404 });
    const entitlements = getPlanEntitlements(shopPlan.plan, shopPlan.trial_ends_at);
    if (entitlements.maxMembers !== null && shopPlan.member_count >= entitlements.maxMembers) {
      return Response.json(
        {
          error: `Your ${entitlements.plan} plan includes up to ${entitlements.maxMembers} studio members. Upgrade to add more.`,
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "A valid member request is required." }, { status: 400 });
    }
    const { fullName, email, role, gender, phone, password, mentorId } = body || {};
    if (!fullName || !email) {
      return Response.json({ error: "Name and email are required." }, { status: 400 });
    }
    const name = String(fullName).trim();
    if (name.length > 120) {
      return Response.json({ error: "Name must be 120 characters or fewer." }, { status: 400 });
    }
    const validRoles = ["madam", "staff", "trainer", "trainee"];
    let finalRole = validRoles.includes(role) ? role : "staff";
    if (ctx.role === "trainer") {
      // Trainers may only add trainees — not staff, trainers, or owners.
      finalRole = "trainee";
    }
    const emailNorm = String(email).toLowerCase().trim();

    if (phone && !isPlausiblePhone(phone)) {
      return Response.json({ error: MESSAGES.badPhone }, { status: 400 });
    }
    // No shared fallback password: if the owner doesn't type one, generate a
    // unique random temporary password and show it to them once.
    const providedPassword = typeof password === "string" && password ? password : null;
    const memberPassword = providedPassword ?? generateTempPassword();
    if (memberPassword.length < MIN_PASSWORD_LENGTH) {
      return Response.json({ error: PASSWORD_TOO_SHORT }, { status: 400 });
    }
    // One account per email (Gmail aliases included) and per phone number.
    const conflict = await findIdentityConflict(admin, { email: emailNorm, phone });
    if (conflict) return Response.json({ error: conflict.message }, { status: 409 });

    // A mentor can only be assigned when creating a trainee, and must be a
    // trainer/madam in the same shop.
    let finalMentorId: string | null = null;
    if (finalRole === "trainee" && mentorId) {
      const { data: mentor } = await ctx.db
        .from("profiles")
        .select("id")
        .eq("id", String(mentorId))
        .eq("shop_id", ctx.shopId)
        .in("role", ["trainer", "madam"])
        .maybeSingle();
      finalMentorId = mentor ? String(mentorId) : null;
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: emailNorm,
      password: memberPassword,
      email_confirm: true,
      // Generated (or owner-typed) passwords are temporary: force a change at first sign-in.
      mustChangePassword: true,
      provision: async (client: PoolClient, user) => {
        await client.query("select pg_advisory_xact_lock(hashtext($1))", [ctx.shopId]);
        const { rows: memberRows } = await client.query(
          "select count(*)::int as member_count from public.profiles where shop_id = $1 and is_active = true",
          [ctx.shopId]
        );
        if (
          entitlements.maxMembers !== null &&
          memberRows[0].member_count >= entitlements.maxMembers
        ) {
          throw new Error(
            `PLAN_LIMIT: Your ${entitlements.plan} plan includes up to ${entitlements.maxMembers} studio members. Upgrade to add more.`
          );
        }
        const result = await client.query(
          `insert into public.profiles
            (id, shop_id, full_name, email, role, gender, phone, mentor_id)
           values ($1, $2, $3, $4, $5, $6, $7, $8)
           returning id, email, full_name, role, gender, phone, shop_id, mentor_id, created_at, updated_at`,
          [
            user.id,
            ctx.shopId,
            name,
            emailNorm,
            finalRole,
            gender || null,
            phone ? String(phone).trim().slice(0, 40) : null,
            finalMentorId,
          ]
        );
        return result.rows[0];
      },
    });
    if (authError || !authData.user) {
      if (authError?.message.startsWith("PLAN_LIMIT:")) {
        return Response.json({ error: authError.message.slice("PLAN_LIMIT:".length).trim() }, { status: 403 });
      }
      const message = authError?.message ?? "";
      if (message.toLowerCase().includes("already")) {
        return Response.json(
          { error: "A member with that email already exists." },
          { status: 409 }
        );
      }
      throw authError ?? new Error("Could not create the member's account.");
    }
    createdAuthUserId = authData.user.id;
    const profile = authData.provisioned;
    if (!profile) throw new Error("Account was created without a member profile.");

    return Response.json({
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      gender: profile.gender,
      phone: profile.phone,
      shopId: profile.shop_id,
      mentorId: profile.mentor_id,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      // Returned once, only when the server generated it.
      ...(providedPassword ? {} : { temporaryPassword: memberPassword }),
    });
  } catch (err) {
    if (createdAuthUserId) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(createdAuthUserId);
      if (cleanupError) console.error("[users/create] auth cleanup failed", cleanupError);
    }
    const friendly = identityErrorMessage(err);
    if (friendly) return Response.json({ error: friendly }, { status: 409 });
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
