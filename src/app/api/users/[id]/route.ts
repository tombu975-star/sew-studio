import { getTenant } from "@/lib/supabase/session";
import { createAdminSupabaseClient } from "@/lib/supabase/adminClient";
import type { Database } from "@/lib/supabase/database.types";
import { findIdentityConflict, isPlausiblePhone, MESSAGES } from "@/lib/identity";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenant();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("id, email, full_name, role, gender, phone, avatar_url, shop_id, mentor_id, training_duration_weeks, training_started_at, program_id, created_at")
    .eq("id", id)
    .eq("shop_id", ctx.shopId)
    .maybeSingle();
  if (!profile) return Response.json({ error: "User not found" }, { status: 404 });

  if (profile.id !== ctx.userId) {
    if (ctx.role !== "madam" && ctx.role !== "trainer") {
      return Response.json({ error: "You cannot view this profile." }, { status: 403 });
    }
    if (ctx.role === "trainer" && !(profile.role === "trainee" && profile.mentor_id === ctx.userId)) {
      return Response.json({ error: "You can only view profiles of trainees you mentor." }, { status: 403 });
    }
  }

  return Response.json({
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    gender: profile.gender,
    phone: profile.phone,
    avatarUrl: profile.avatar_url,
    shopId: profile.shop_id,
    mentorId: profile.mentor_id,
    trainingDurationWeeks: profile.training_duration_weeks,
    trainingStartedAt: profile.training_started_at,
    programId: profile.program_id,
    createdAt: profile.created_at,
  });
}

// PATCH — update a user (used by trainer/owner to set mentor + training duration on trainees)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (ctx.role !== "madam" && ctx.role !== "trainer") {
      return Response.json(
        { error: "Only the studio owner or a trainer can edit member profiles." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const { data: existing } = await ctx.supabase
      .from("profiles")
      .select("id, role, mentor_id")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!existing) return Response.json({ error: "User not found" }, { status: 404 });
    if (
      ctx.role === "trainer" &&
      !(existing.role === "trainee" && existing.mentor_id === ctx.userId)
    ) {
      return Response.json(
        { error: "You can only edit trainees you mentor." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      mentorId,
      trainingDurationWeeks,
      trainingStartedAt,
      programId,
      fullName,
      phone,
      gender,
      avatarUrl,
      canAccessOrders,
      canAccessBoard,
      canManageFreelancers,
    } = body || {};

    const data: Database["public"]["Tables"]["profiles"]["Update"] = {};
    if (mentorId !== undefined) {
      if (mentorId) {
        const { data: mentor } = await ctx.supabase
          .from("profiles")
          .select("id")
          .eq("id", String(mentorId))
          .eq("shop_id", ctx.shopId)
          .maybeSingle();
        data.mentor_id = mentor ? String(mentorId) : null;
      } else {
        data.mentor_id = null;
      }
    }
    if (trainingDurationWeeks !== undefined)
      data.training_duration_weeks = trainingDurationWeeks ? Number(trainingDurationWeeks) : null;
    if (trainingStartedAt !== undefined)
      data.training_started_at = trainingStartedAt ? new Date(trainingStartedAt).toISOString() : null;
    if (programId !== undefined) {
      if (programId) {
        const { data: program } = await ctx.supabase
          .from("training_programs")
          .select("id")
          .eq("id", String(programId))
          .eq("shop_id", ctx.shopId)
          .maybeSingle();
        data.program_id = program ? String(programId) : null;
      } else {
        data.program_id = null;
      }
    }
    if (fullName !== undefined) data.full_name = fullName;
    if (phone !== undefined) {
      data.phone = phone || null;
      if (phone) {
        if (!isPlausiblePhone(phone)) {
          return Response.json({ error: MESSAGES.badPhone }, { status: 400 });
        }
        const conflict = await findIdentityConflict(createAdminSupabaseClient(), {
          phone,
          excludeId: id,
        });
        if (conflict) return Response.json({ error: conflict.message }, { status: 409 });
      }
    }
    if (gender !== undefined) data.gender = gender || null;
    if (avatarUrl !== undefined) {
      const raw = typeof avatarUrl === "string" ? avatarUrl.trim() : "";
      if (raw && !/^https?:\/\//i.test(raw)) {
        return Response.json({ error: "Profile picture must be an http(s) link." }, { status: 400 });
      }
      data.avatar_url = raw ? raw.slice(0, 1000) : null;
    }
    if (canAccessOrders !== undefined) data.can_access_orders = Boolean(canAccessOrders);
    if (canAccessBoard !== undefined) data.can_access_board = Boolean(canAccessBoard);
    // Freelancer management is a financial/business-relationship permission
    // — only the owner grants it, even for fields a trainer can otherwise
    // edit on their own mentee.
    if (canManageFreelancers !== undefined && ctx.role !== "madam") {
      return Response.json(
        { error: "Only the studio owner can grant freelancer access." },
        { status: 403 }
      );
    }
    if (canManageFreelancers !== undefined)
      data.can_manage_freelancers = Boolean(canManageFreelancers);

    const { data: updated, error } = await ctx.supabase
      .from("profiles")
      .update(data)
      .eq("id", id)
      .select(
        "id, email, full_name, role, gender, phone, avatar_url, shop_id, mentor_id, training_duration_weeks, training_started_at, program_id, can_access_orders, can_access_board, can_manage_freelancers, created_at, updated_at"
      )
      .single();
    if (error) throw error;

    return Response.json({
      id: updated.id,
      email: updated.email,
      fullName: updated.full_name,
      role: updated.role,
      gender: updated.gender,
      phone: updated.phone,
      shopId: updated.shop_id,
      mentorId: updated.mentor_id,
      trainingDurationWeeks: updated.training_duration_weeks,
      trainingStartedAt: updated.training_started_at,
      programId: updated.program_id,
      canAccessOrders: updated.can_access_orders,
      canAccessBoard: updated.can_access_board,
      canManageFreelancers: updated.can_manage_freelancers,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/users/[id] → { ok: true, openOrders: number }
// "Remove from studio" (owner only). Nothing is deleted: the member loses the
// ability to sign in and disappears from the team list, but every order,
// grade and certificate that mentions them stays intact.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (ctx.role !== "madam") {
      return Response.json(
        { error: "Only the studio owner can remove a team member." },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (id === ctx.userId) {
      return Response.json({ error: "You can't remove yourself." }, { status: 400 });
    }

    const { data: target } = await ctx.supabase
      .from("profiles")
      .select("id, role")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!target) return Response.json({ error: "User not found" }, { status: 404 });
    if (target.role === "madam") {
      return Response.json({ error: "The studio owner can't be removed." }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const nowIso = new Date().toISOString();

    // 1. Mark inactive. If migration 0012 hasn't been run, this column is missing.
    const { error: flagError } = await admin
      .from("profiles")
      .update({ is_active: false, removed_at: nowIso })
      .eq("id", id)
      .eq("shop_id", ctx.shopId);
    if (flagError) {
      return Response.json(
        {
          error:
            "Couldn't remove this member. Make sure migration 0012_member_removal.sql has been run in Supabase. (" +
            flagError.message +
            ")",
        },
        { status: 500 }
      );
    }

    // 2. Block sign-in. Their existing session stops working straight away
    //    too, because getTenant() rejects inactive members.
    const { error: banError } = await admin.auth.admin.updateUserById(id, {
      ban_duration: "876000h",
    });
    if (banError) console.error("Could not ban removed member:", banError.message);

    // 3. Free up their unfinished work and any trainees they mentored.
    await admin
      .from("tasks")
      .update({ staff_id: null })
      .eq("shop_id", ctx.shopId)
      .eq("staff_id", id)
      .neq("status", "Done");
    await admin
      .from("profiles")
      .update({ mentor_id: null })
      .eq("shop_id", ctx.shopId)
      .eq("mentor_id", id);

    // 4. Tell the owner how many live orders still list them as the tailor.
    const { count } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", ctx.shopId)
      .eq("assigned_staff_id", id)
      .not("status", "in", '("Completed","Collected/Delivered")');

    return Response.json({ ok: true, openOrders: count ?? 0 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
