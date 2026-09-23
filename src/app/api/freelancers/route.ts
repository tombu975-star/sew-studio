import { db } from "@/lib/db";
import { getTenant, tenantWhere, canManageFreelancers } from "@/lib/tenant";

const SAFE_FREELANCER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  specialty: true,
  skills: true,
};

// GET /api/freelancers — this shop's linked freelancers (their own
// rate notes/status here, plus the freelancer's shared identity fields).
// A shop only ever sees freelancers IT has linked — never another
// shop's roster, and never the freelancer's password.
export async function GET(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const links = await db.freelancerShopLink.findMany({
      where: tenantWhere(ctx.shopId),
      orderBy: { createdAt: "desc" },
      include: { freelancer: { select: SAFE_FREELANCER_SELECT } },
    });

    const freelancers = links.map((l) => ({
      linkId: l.id,
      id: l.freelancer.id,
      name: l.freelancer.fullName,
      email: l.freelancer.email,
      phone: l.freelancer.phone,
      specialty: l.freelancer.specialty,
      skills: l.freelancer.skills,
      rateNotes: l.rateNotes,
      status: l.status,
      createdAt: l.createdAt,
    }));
    return Response.json(freelancers);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// POST /api/freelancers — commission a freelancer. If a freelancer
// account with this email already exists (they may already work with
// other shops), this just links them to this shop — it never creates a
// duplicate identity and never lets this shop see the existing
// account's password or other shops' data. Only a brand-new email
// creates a brand-new login.
export async function POST(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageFreelancers(ctx)) {
      return Response.json(
        {
          error:
            "Only the studio owner, or someone granted freelancer access, can manage freelancers.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      fullName,
      email,
      phone,
      specialty,
      skills,
      rateNotes,
      status,
      password,
    } = body || {};
    if (!fullName || !email) {
      return Response.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }
    const normalizedEmail = String(email).toLowerCase().trim();

    let freelancer = await db.freelancerAccount.findUnique({
      where: { email: normalizedEmail },
    });

    if (!freelancer) {
      freelancer = await db.freelancerAccount.create({
        data: {
          email: normalizedEmail,
          fullName: String(fullName).trim(),
          phone: phone || null,
          specialty: specialty || null,
          skills: skills || null,
          password: password || "freelancer2025",
        },
      });
    }

    const existingLink = await db.freelancerShopLink.findUnique({
      where: {
        shopId_freelancerId: { shopId: ctx.shopId, freelancerId: freelancer.id },
      },
    });
    if (existingLink) {
      return Response.json(
        { error: "This freelancer is already linked to your shop." },
        { status: 409 }
      );
    }

    const link = await db.freelancerShopLink.create({
      data: {
        shopId: ctx.shopId,
        freelancerId: freelancer.id,
        rateNotes: rateNotes || null,
        status: status || "Available",
      },
    });

    return Response.json({
      linkId: link.id,
      id: freelancer.id,
      name: freelancer.fullName,
      email: freelancer.email,
      phone: freelancer.phone,
      specialty: freelancer.specialty,
      skills: freelancer.skills,
      rateNotes: link.rateNotes,
      status: link.status,
      createdAt: link.createdAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
