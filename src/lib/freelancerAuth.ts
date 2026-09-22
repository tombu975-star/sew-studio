import { db } from "@/lib/db";

export interface FreelancerAuthContext {
  freelancerId: string;
}

/**
 * Read the freelancer session cookie from a Request and return the
 * freelancer's id. Returns null if not authenticated.
 *
 * Deliberately its own cookie (`fs_session`) and its own lookup —
 * completely separate from getTenant()/ms_session. A freelancer is
 * never a shop tenant, so there is no shopId here, ever.
 */
export async function getFreelancerAuth(
  req: Request
): Promise<FreelancerAuthContext | null> {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/fs_session=([^;]+)/);
    if (!match) return null;

    const freelancerId = Buffer.from(match[1], "base64").toString("utf-8");
    if (!freelancerId) return null;

    const freelancer = await db.freelancerAccount.findUnique({
      where: { id: freelancerId },
      select: { id: true },
    });
    if (!freelancer) return null;

    return { freelancerId: freelancer.id };
  } catch {
    return null;
  }
}
