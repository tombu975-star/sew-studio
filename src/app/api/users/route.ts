import { getTenant } from "@/lib/db/session";
import { createAdminClient } from "@/lib/db/adminClient";
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

    const body = await req.json();
    const { fullName, email, role, gender, phone, password, mentorId } = body || {};
    if (!fullName || !email) {
      return Response.json({ error: "Name and email are required." }, { status: 400 });
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
      password: String(password || "atelier2025"),
      email_confirm: true,
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

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .insert({
        id: createdAuthUserId,
        shop_id: ctx.shopId,
        full_name: String(fullName).trim(),
        email: emailNorm,
        role: finalRole,
        gender: gender || null,
        phone: phone || null,
        mentor_id: finalMentorId,
      })
      .select(
        "id, email, full_name, role, gender, phone, shop_id, mentor_id, created_at, updated_at"
      )
      .single();
    if (profileError || !profile) throw profileError ?? new Error("Could not create the profile.");

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
      await admin.auth.admin.deleteUser(createdAuthUserId).catch(() => {});
    }
    const friendly = identityErrorMessage(err);
    if (friendly) return Response.json({ error: friendly }, { status: 409 });
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
