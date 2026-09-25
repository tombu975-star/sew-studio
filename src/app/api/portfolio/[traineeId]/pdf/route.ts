import { getTenant } from "@/lib/supabase/session";
import { buildPortfolioPdf } from "@/lib/portfolio-pdf";

// GET /api/portfolio/[traineeId]/pdf
// A trainee may only download their own portfolio. Trainer/madam may
// download any trainee's in their shop. Everyone else is denied — this
// compiles completed work, scores, feedback and skills history, which is
// the same sensitive-data class as tasks/training-logs/certificates.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ traineeId: string }> },
) {
  try {
    const ctx = await getTenant();
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { traineeId } = await params;

    const isPrivileged = ctx.role === "madam" || ctx.role === "trainer";
    if (!isPrivileged && ctx.userId !== traineeId) {
      return Response.json(
        { error: "You can only download your own portfolio." },
        { status: 403 },
      );
    }

    const { data: shop } = await ctx.supabase
      .from("shops")
      .select("name")
      .eq("id", ctx.shopId)
      .maybeSingle();

    const { data: trainee } = await ctx.supabase
      .from("profiles")
      .select(
        "*, mentor:profiles!profiles_mentor_id_fkey(full_name), program:training_programs(name, level)"
      )
      .eq("id", traineeId)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!trainee) {
      return Response.json({ error: "Trainee not found" }, { status: 404 });
    }

    const [tasksRes, logsRes, certRes] = await Promise.all([
      ctx.supabase
        .from("tasks")
        .select("*, competency_unit:competency_units(title)")
        .eq("shop_id", ctx.shopId)
        .eq("staff_id", traineeId)
        .eq("status", "Done")
        .order("updated_at", { ascending: false }),
      ctx.supabase
        .from("training_logs")
        .select("*")
        .eq("shop_id", ctx.shopId)
        .eq("trainee_id", traineeId)
        .order("date", { ascending: false }),
      ctx.supabase
        .from("certificates")
        .select("*, issued_by:profiles!certificates_issued_by_id_fkey(full_name)")
        .eq("shop_id", ctx.shopId)
        .eq("trainee_id", traineeId)
        .order("issued_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const completedTasks = tasksRes.data ?? [];
    const skillLogs = logsRes.data ?? [];
    const certificate = certRes.data;

    const pdfBytes = await buildPortfolioPdf({
      shopName: shop?.name ?? "Studio",
      traineeName: trainee.full_name,
      traineeEmail: trainee.email,
      mentorName: trainee.mentor?.full_name ?? null,
      programName: trainee.program?.name ?? null,
      programLevel: trainee.program?.level ?? null,
      trainingDurationWeeks: trainee.training_duration_weeks,
      trainingStartedAt: trainee.training_started_at,
      completedTasks: completedTasks.map((t) => ({
        title: t.title,
        competencyUnitTitle: t.competency_unit?.title ?? null,
        score: t.score,
        maxScore: t.max_score,
        feedback: t.feedback,
        updatedAt: t.updated_at,
      })),
      skillLogs: skillLogs.map((l) => ({
        skill: l.skill?.trim() || l.title,
        status: l.status,
        date: l.date,
        note: l.note,
      })),
      certificate: certificate
        ? {
            certificateNo: certificate.certificate_no,
            programName: certificate.program_name,
            durationWeeks: certificate.duration_weeks,
            skillsAchieved: certificate.skills_achieved,
            honors: certificate.honors,
            issuedAt: certificate.issued_at,
            issuedByName: certificate.issued_by?.full_name ?? null,
          }
        : null,
    });

    const fileName = `${trainee.full_name.replace(/[^a-z0-9]+/gi, "-")}-portfolio.pdf`;

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
