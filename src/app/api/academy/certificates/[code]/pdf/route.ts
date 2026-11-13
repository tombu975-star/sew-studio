import { buildCertificatePdf } from "@/lib/academy/certificate-pdf";
import { SITE } from "@/lib/site-config";
import { getPool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

// The certificate number is the credential: anyone holding it can download or check the certificate.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^SEW-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return new Response("Not found", { status: 404 });
  const { rows } = await getPool().query("select learner_name, course_title, issued_at from public.academy_certificates where code = $1", [code]);
  if (!rows[0]) return new Response("Not found", { status: 404 });
  const base = (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin || SITE.appUrl).replace(/\/$/, "");
  const bytes = await buildCertificatePdf({ code, learnerName: rows[0].learner_name, courseTitle: rows[0].course_title, issuedAt: new Date(rows[0].issued_at), verifyUrl: `${base}/academy/verify/${code}` });
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="sewsiness-certificate-${code}.pdf"`, "Cache-Control": "private, max-age=300" } });
}
