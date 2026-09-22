import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

// Note: :id here is the FreelancerShopLink id (this shop's own link to
// the freelancer), NOT the freelancer's global account id — that's what
// keeps ownership checks correctly scoped to "this shop's relationship
// with them" rather than the shared identity itself.

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (ctx.role === "trainee") {
      return Response.json(
        { error: "Trainees can't manage freelancers." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await db.freelancerShopLink.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "Freelancer not found" }, { status: 404 });
    }

    const body = await req.json();
    const { rateNotes, status } = body || {};
    const updated = await db.freelancerShopLink.update({
      where: { id },
      data: {
        ...(rateNotes !== undefined && { rateNotes }),
        ...(status !== undefined && { status }),
      },
      include: {
        freelancer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            specialty: true,
            skills: true,
          },
        },
      },
    });

    return Response.json({
      linkId: updated.id,
      id: updated.freelancer.id,
      name: updated.freelancer.fullName,
      email: updated.freelancer.email,
      phone: updated.freelancer.phone,
      specialty: updated.freelancer.specialty,
      skills: updated.freelancer.skills,
      rateNotes: updated.rateNotes,
      status: updated.status,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// Unlink only — this NEVER deletes the freelancer's shared account,
// since other shops may still be commissioning them. Their jobs from
// this shop stay on record; only the shop<->freelancer relationship ends.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (ctx.role === "trainee") {
      return Response.json(
        { error: "Trainees can't manage freelancers." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await db.freelancerShopLink.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "Freelancer not found" }, { status: 404 });
    }
    await db.freelancerShopLink.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
