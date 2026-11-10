import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { createAdminClient } from "@/lib/db/adminClient";
import { createRequestClient } from "@/lib/db/requestClient";
import { sendFreelancerVerification } from "@/lib/freelancer-verification";
import { findIdentityConflict, identityErrorMessage, isPlausiblePhone, MESSAGES } from "@/lib/identity";

const SPECIALTIES = ["Beader", "Embroiderer", "Cutter", "Tailor", "Designer", "Photographer", "Other"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/freelancer-auth/register — a freelancer creates their own account.
//
// Mirrors shop registration: it uses the service-role client because there is
// no RLS INSERT policy for ordinary users on `freelancer_profiles`. The new
// account starts with NO shop links — a studio adds the freelancer later by
// their email (Team → Freelancers → Add Freelancer), which reuses this
// profile instead of creating a second one.
export async function POST(req: Request) {
  const admin = createAdminClient();
  let createdAuthUserId: string | null = null;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A valid registration request is required." }, { status: 400 });
    }
    const { fullName, email, password, phone, specialty, skills } = body;

    const name = String(fullName ?? "").trim();
    const emailNorm = String(email ?? "").toLowerCase().trim();
    if (!name || !emailNorm || !password) {
      return NextResponse.json(
        { error: "Your name, email and password are required." },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(emailNorm)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (String(password).length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }
    if (phone && !isPlausiblePhone(phone)) {
      return NextResponse.json({ error: MESSAGES.badPhone }, { status: 400 });
    }
    if (name.length > 120 || emailNorm.length > 254) {
      return NextResponse.json({ error: "Name or email is too long." }, { status: 400 });
    }

    // One account per email and per phone number, across the whole app.
    const conflict = await findIdentityConflict(admin, { email: emailNorm, phone });
    if (conflict) {
      return NextResponse.json({ error: conflict.message }, { status: 409 });
    }

    const specialtyClean =
      specialty && SPECIALTIES.includes(String(specialty)) ? String(specialty) : null;

    // 1. The sign-in (pre-confirmed, like shop owners — this app has no
    //    email-verification step).
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: emailNorm,
      password: String(password),
      email_confirm: true,
      provision: async (client: PoolClient, user) => {
        const result = await client.query(
          `insert into public.freelancer_profiles
            (id, email, full_name, phone, specialty, skills)
           values ($1, $2, $3, $4, $5, $6)
           returning id, email, full_name, phone, specialty, skills, verified_at`,
          [
            user.id,
            emailNorm,
            name,
            phone ? String(phone).trim().slice(0, 40) : null,
            specialtyClean,
            skills ? String(skills).trim().slice(0, 300) : null,
          ]
        );
        return result.rows[0];
      },
    });
    if (authError || !authData.user) {
      if ((authError?.message ?? "").toLowerCase().includes("already")) {
        return NextResponse.json(
          {
            error:
              "An account with that email already exists. Try signing in, or use a different email.",
          },
          { status: 409 }
        );
      }
      throw authError ?? new Error("Could not create the account.");
    }
    createdAuthUserId = authData.user.id;
    const profile = authData.provisioned;
    if (!profile) throw new Error("Account was created without a freelancer profile.");

    // Sign them in so they land straight in their portal.
    const db = await createRequestClient();
    const { error: signInError } = await db.auth.signInWithPassword({
      email: emailNorm,
      password: String(password),
    });
    if (signInError) throw signInError;

    // Send the verification link. Registration still succeeds if email delivery fails;
    // the freelancer can request another from their portal.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const verification = await sendFreelancerVerification({
      freelancerId: profile.id,
      email: profile.email,
      name: profile.full_name,
      appUrl,
    }).catch(() => ({ sent: false }));

    return NextResponse.json({
      verificationEmailSent: verification.sent,
      freelancer: {
        verified: false,
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        phone: profile.phone,
        specialty: profile.specialty,
        skills: profile.skills,
      },
    });
  } catch (error) {
    console.error("[freelancer-auth/register]", error);
    // Don't leave a sign-in behind with no profile.
    if (createdAuthUserId) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(createdAuthUserId);
      if (cleanupError) console.error("[freelancer-auth/register] auth cleanup failed", cleanupError);
    }
    const friendly = identityErrorMessage(error);
    if (friendly) return NextResponse.json({ error: friendly }, { status: 409 });
    return NextResponse.json(
      { error: "Could not create your account. Please try again." },
      { status: 500 }
    );
  }
}
