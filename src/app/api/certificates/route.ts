import { getTenant } from "@/lib/supabase/session";
import { serializeCertificate } from "@/lib/supabase/serializers";

const CERT_SELECT =
  "*, trainee:profiles!certificates_trainee_id_fkey(id, full_name, email, gender), issued_by:profiles!certificates_issued_by_id_fkey(id, full_name)";

// GET /api/certificates?traineeId=ID — certificates for a trainee (or all if no filter)
export async function GET(req: Request) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const requestedTraineeId = url.searchParams.get("traineeId");
    // Same rule as /api/training-logs: a trainee can't ask for anyone
    // else's certificates by passing a different traineeId.
    const traineeId = ctx.role === "trainee" ? ctx.userId : requestedTraineeId;

    let query = ctx.supabase.from("certificates").select(CERT_SELECT).eq("shop_id", ctx.shopId);
    if (traineeId) query = query.eq("trainee_id", traineeId);

    const { data: certs, error } = await query.order("issued_at", { ascending: false });
    if (error) throw error;

    return Response.json(certs.map(serializeCertificate));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

// POST — issue a certificate to a trainee
export async function POST(req: Request) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { traineeId, issuedById, programName, durationWeeks, skillsAchieved, honors } = body || {};
    if (!traineeId || !issuedById) {
      return Response.json({ error: "Trainee and issuer are required." }, { status: 400 });
    }

    const [{ data: trainee }, { data: issuer }] = await Promise.all([
      ctx.supabase.from("profiles").select("id").eq("id", String(traineeId)).eq("shop_id", ctx.shopId).maybeSingle(),
      ctx.supabase.from("profiles").select("id").eq("id", String(issuedById)).eq("shop_id", ctx.shopId).maybeSingle(),
    ]);
    if (!trainee || !issuer) {
      return Response.json({ error: "Trainee or issuer not found in this shop." }, { status: 404 });
    }

    const { data: existing } = await ctx.supabase
      .from("certificates")
      .select("id")
      .eq("trainee_id", traineeId)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (existing) {
      return Response.json({ error: "This trainee already has a certificate." }, { status: 409 });
    }

    const certNo = `MS-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const { data: cert, error } = await ctx.supabase
      .from("certificates")
      .insert({
        shop_id: ctx.shopId,
        trainee_id: traineeId,
        issued_by_id: issuedById,
        program_name: programName || "Atelier Apprenticeship Programme",
        duration_weeks: Number(durationWeeks) || 12,
        skills_achieved: skillsAchieved || "",
        honors: honors || null,
        certificate_no: certNo,
      })
      .select(CERT_SELECT)
      .single();
    if (error) throw error;

    return Response.json(serializeCertificate(cert));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
