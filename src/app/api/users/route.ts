import { getTenant } from "@/lib/db/session";
import { createAdminClient } from "@/lib/db/adminClient";
import type { PoolClient } from "pg";
import { findIdentityConflict, identityErrorMessage, isPlausiblePhone, MESSAGES } from "@/lib/identity";

export async function GET() {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // RLS already scopes this to ctx.shopId — the explicit .eq is defense
    // in depth, matching the app's existing convention of never relying on
    // a single layer for tenant isolation.
    const columns = "id, email, full_name, role, gender, phone, shop_id, mentor_id, training_duration_weeks, training_started_at, can_access_orders, can_access_board, created_at, updated_at";
    const listMembers = (activeOnly: boolean) => {
      let q = ctx.db.from("profiles").select(columns).eq("shop_id", ctx.shopId);
      if (activeOnly) q = q.eq("is_active", true);
      return q.order("created_at", { ascending: true });
    };
    // Hide removed members; if migration 0012 isn't applied yet, list everyone.
    let { data: users, error } = await listMembers(true);
    if (error) ({ data: users, error } = await listMembers(false));
    if (error || !users) throw error ?? new Error("Could not load team");

    return Response.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        role: u.role,
        gender: u.gender,
        phone: u.phone,
        shopId: u.shop_id,
        mentorId: u.mentor_id,
        trainingDurationWeeks: u.training_duration_weeks,
        trainingStartedAt: u.training_started_at,
        canAccessOrders: u.can_access_orders,
        canAccessBoard: u.can_access_board,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      }))
    );
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
    const memberPassword = typeof password === "string" && password ? password : "atelier2025";
    if (memberPassword.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });
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
      provision: async (client: PoolClient, user) => {
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
