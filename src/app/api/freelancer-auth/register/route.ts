import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/adminClient";
import { createRequestClient } from "@/lib/db/requestClient";
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
    const { fullName, email, password, phone, specialty, skills } = await req.json();

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
    if (String(password).length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }
    if (phone && !isPlausiblePhone(phone)) {
      return NextResponse.json({ error: MESSAGES.badPhone }, { status: 400 });
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

    // 2. The freelancer profile (same id as the sign-in).
    const { data: profile, error: profileError } = await admin
      .from("freelancer_profiles")
      .insert({
        id: createdAuthUserId,
        email: emailNorm,
        full_name: name.slice(0, 120),
        phone: phone ? String(phone).trim().slice(0, 40) : null,
        specialty: specialtyClean,
        skills: skills ? String(skills).trim().slice(0, 300) : null,
      })
      .select("id, email, full_name, phone, specialty, skills")
      .single();
    if (profileError || !profile) throw profileError ?? new Error("Could not create the profile.");

    // 3. Sign them in so they land straight in their portal.
    const db = await createRequestClient();
    const { error: signInError } = await db.auth.signInWithPassword({
      email: emailNorm,
      password: String(password),
    });
    if (signInError) throw signInError;

    return NextResponse.json({
      freelancer: {
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
      await admin.auth.admin.deleteUser(createdAuthUserId).catch(() => {});
    }
    const friendly = identityErrorMessage(error);
    if (friendly) return NextResponse.json({ error: friendly }, { status: 409 });
    return NextResponse.json(
      { error: "Could not create your account. Please try again." },
      { status: 500 }
    );
  }
}
