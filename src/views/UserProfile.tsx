"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Phone,
  Save,
  UserRound,
  KeyRound,
  ShieldCheck,
  Calendar,
  GraduationCap,
  LogOut,
  Eye,
  EyeOff,
} from "lucide-react";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { SectionCard } from "@/components/atelier/SectionCard";
import { ImageUpload } from "@/components/atelier/ImageUpload";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useAuth, type AuthUser } from "@/stores/auth";
import { useNav } from "@/stores/nav";
import { formatDate } from "@/lib/format";

interface ProfileDetails extends AuthUser {
  mentorId?: string | null;
  trainingDurationWeeks?: number | null;
  trainingStartedAt?: string | null;
  createdAt?: string;
}

const ROLE_NAMES: Record<string, string> = {
  madam: "Studio owner",
  staff: "Staff",
  trainer: "Trainer",
  trainee: "Trainee",
  freelancer: "Freelancer",
};

const ROLE_ACCENT: Record<string, string> = {
  madam: "#9E5A44",
  staff: "#0E7490",
  trainer: "#9E5A44",
  trainee: "#3D5166",
  freelancer: "#7A4568",
};

/** api.ts throws `${status} ${statusText} — ${rawBody}` — rawBody is the
 *  route's JSON error payload, so pull the human message back out of it. */
function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const raw = err.message.split("—").slice(1).join("—").trim();
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error) return String(parsed.error);
  } catch {
    // not JSON — fall through
  }
  return raw || fallback;
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function UserProfile() {
  const { selectedId, go } = useNav();
  const { user: currentUser, updateProfile, logout } = useAuth();
  const isSelf = !selectedId || selectedId === currentUser?.id;
  // The signed-in owner/trainer can edit any team member's basic details —
  // the server re-checks this on save (and further scopes trainers to
  // their own mentees), this only controls whether we show the form.
  const canEditOthers = currentUser?.role === "madam" || currentUser?.role === "trainer";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const profileQuery = useQuery<ProfileDetails>({
    queryKey: ["user-profile", isSelf ? currentUser?.id : selectedId],
    queryFn: async () => {
      if (isSelf) {
        const response = await apiGet<{ user: ProfileDetails }>("/api/auth/me");
        if (!response.user) throw new Error("Your profile could not be found.");
        return response.user;
      }
      return apiGet<ProfileDetails>(`/api/users/${selectedId}`);
    },
    enabled: !!currentUser && (isSelf || !!selectedId),
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setFullName(profileQuery.data.fullName || "");
    setPhone(profileQuery.data.phone || "");
    setGender(profileQuery.data.gender || "");
    setAvatarUrl(profileQuery.data.avatarUrl || "");
    setAvatarBroken(false);
  }, [profileQuery.data]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      if (isSelf) {
        await updateProfile({ fullName, phone: phone.trim() || null, gender: gender || null, avatarUrl: avatarUrl.trim() || null });
      } else if (selectedId) {
        await apiPatch(`/api/users/${selectedId}`, {
          fullName,
          phone: phone.trim() || null,
          gender: gender || null,
          avatarUrl: avatarUrl.trim() || null,
        });
      }
      await profileQuery.refetch();
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Could not update this profile."));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("The new passwords don't match.");
      return;
    }
    setChangingPassword(true);
    try {
      await apiPost("/api/auth/change-password", { currentPassword, newPassword });
      toast.success("Password updated.");
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Could not update your password."));
    } finally {
      setChangingPassword(false);
    }
  }

  const profile = profileQuery.data;
  const showEditForm = isSelf || canEditOthers;
  const accent = ROLE_ACCENT[profile?.role || ""] || "#9E5A44";

  return (
    <div className="mx-auto w-full max-w-[900px] p-5 md:p-8">
      {selectedId && (
        <button onClick={() => go("team")} className="mb-5 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-[#9E5A44] transition-colors">
          <ArrowLeft className="size-4" /> Team
        </button>
      )}

      {profileQuery.isLoading ? (
        <div className="space-y-4">
          <div className="h-24 rounded-2xl bg-stone-100 animate-pulse" />
          <div className="h-64 rounded-2xl bg-stone-100 animate-pulse" />
        </div>
      ) : profileQuery.isError || !profile ? (
        <>
          <div className="mb-6 flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#9E5A44] text-white">
              <UserRound className="size-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Account</p>
              <h1 className="font-display text-2xl font-semibold text-[#1C1A18]">Profile</h1>
            </div>
          </div>
          <SectionCard title="Profile unavailable">
            <p className="text-sm text-stone-500">This profile could not be loaded or you do not have permission to view it.</p>
            <PremiumButton className="mt-4" variant="outline" onClick={() => profileQuery.refetch()}>Try again</PremiumButton>
          </SectionCard>
        </>
      ) : (
        <>
          {/* ─── Premium profile header banner ──────────────────── */}
          <div
            className="relative overflow-hidden rounded-2xl border border-[#EAE6DF] elevate-sm mb-6"
            style={{
              background: "#ffffff",
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-6">
              <div className="relative shrink-0">
                {profile.avatarUrl && !avatarBroken ? (
                   
                  <img
                    src={profile.avatarUrl}
                    alt={`${profile.fullName} profile picture`}
                    onError={() => setAvatarBroken(true)}
                    className="size-24 rounded-2xl object-cover border border-[#EAE6DF]"
                  />
                ) : (
                  <div
                    className="flex size-24 items-center justify-center rounded-2xl text-white text-3xl font-semibold font-display"
                    style={{ background: accent }}
                  >
                    {initialsOf(profile.fullName || profile.email)}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-white bg-[#4A6B53]">
                  <ShieldCheck className="size-2.5 text-white" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-1">
                  {isSelf ? "My profile" : "Team profile"}
                </p>
                <h1 className="font-display text-2xl font-semibold text-[#1C1A18] truncate">{profile.fullName}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full border px-3 py-1 text-xs font-medium"
                    style={{ borderColor: `${accent}30`, backgroundColor: `${accent}0d`, color: accent }}
                  >
                    {ROLE_NAMES[profile.role] || profile.role}
                  </span>
                  {profile.shop?.name && <span className="text-xs text-stone-500">{profile.shop.name}</span>}
                  {profile.createdAt && (
                    <span className="inline-flex items-center gap-1 text-xs text-stone-400">
                      <Calendar className="size-3" /> Joined {formatDate(profile.createdAt)}
                    </span>
                  )}
                </div>
              </div>
              {isSelf && (
                <PremiumButton variant="outline" size="sm" onClick={() => logout()} className="shrink-0">
                  <LogOut className="size-3.5" /> Sign out
                </PremiumButton>
              )}
            </div>
          </div>

          <div className="grid gap-5">
            <SectionCard title={isSelf ? "Your details" : "Member details"}>
              {showEditForm ? (
                <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-medium text-stone-600">
                    Full name
                    <input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#EAE6DF] px-3 text-sm text-[#1C1A18] outline-none focus:border-[#9E5A44] focus:ring-2 focus:ring-[#9E5A44]/10" />
                  </label>
                  <label className="text-xs font-medium text-stone-600">
                    Email
                    <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-[#EAE6DF] bg-stone-50 px-3 text-sm font-normal text-stone-500"><Mail className="size-4" />{profile.email}</span>
                  </label>
                  <label className="text-xs font-medium text-stone-600">
                    Phone
                    <span className="relative mt-2 block">
                      <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
                      <input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="h-11 w-full rounded-md border border-[#EAE6DF] pl-9 pr-3 text-sm text-[#1C1A18] outline-none focus:border-[#9E5A44] focus:ring-2 focus:ring-[#9E5A44]/10" />
                    </span>
                  </label>
                  <label className="text-xs font-medium text-stone-600">
                    Gender
                    <select value={gender} onChange={(event) => setGender(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#EAE6DF] bg-white px-3 text-sm text-[#1C1A18] outline-none focus:border-[#9E5A44]">
                      <option value="">Not specified</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-stone-600 mb-2">Profile picture</p>
                    <ImageUpload
                      kind="avatar"
                      value={avatarUrl}
                      onChange={setAvatarUrl}
                      label="Upload photo"
                      hint="A clear, front-facing photo works best · JPG, PNG or WebP · up to 5 MB"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between gap-3 pt-1">
                    <p className="text-[11px] text-stone-400">
                      {isSelf ? "Only you can see and change these." : "Visible to studio owners and trainers."}
                    </p>
                    <PremiumButton type="submit" loading={saving}>
                      <Save className="size-4" /> Save profile
                    </PremiumButton>
                  </div>
                </form>
              ) : (
                <dl className="grid gap-5 sm:grid-cols-2">
                  <div><dt className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Email</dt><dd className="mt-1 text-sm text-[#1C1A18]">{profile.email}</dd></div>
                  <div><dt className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Phone</dt><dd className="mt-1 text-sm text-[#1C1A18]">{profile.phone || "Not provided"}</dd></div>
                  <div><dt className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Gender</dt><dd className="mt-1 text-sm text-[#1C1A18]">{profile.gender || "Not provided"}</dd></div>
                </dl>
              )}
            </SectionCard>

            {(profile.trainingDurationWeeks || profile.trainingStartedAt) && (
              <SectionCard title="Training" action={<GraduationCap className="size-4 text-stone-400" />}>
                <dl className="grid gap-5 sm:grid-cols-2">
                  {profile.trainingDurationWeeks && (
                    <div><dt className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Duration</dt><dd className="mt-1 text-sm text-[#1C1A18]">{profile.trainingDurationWeeks} weeks</dd></div>
                  )}
                  {profile.trainingStartedAt && (
                    <div><dt className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Started</dt><dd className="mt-1 text-sm text-[#1C1A18]">{formatDate(profile.trainingStartedAt)}</dd></div>
                  )}
                </dl>
              </SectionCard>
            )}

            {isSelf && (
              <SectionCard
                title="Password & security"
                action={<KeyRound className="size-4 text-stone-400" />}
              >
                {!showPasswordForm ? (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-stone-500">Change the password you use to sign in.</p>
                    <PremiumButton type="button" variant="outline" size="sm" onClick={() => setShowPasswordForm(true)}>
                      Change password
                    </PremiumButton>
                  </div>
                ) : (
                  <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-medium text-stone-600 sm:col-span-2">
                      Current password
                      <span className="relative mt-2 block">
                        <input
                          required
                          type={showCurrent ? "text" : "password"}
                          autoComplete="current-password"
                          value={currentPassword}
                          onChange={(event) => setCurrentPassword(event.target.value)}
                          className="h-11 w-full rounded-md border border-[#EAE6DF] pl-3 pr-10 text-sm text-[#1C1A18] outline-none focus:border-[#9E5A44] focus:ring-2 focus:ring-[#9E5A44]/10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                          tabIndex={-1}
                        >
                          {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </span>
                    </label>
                    <label className="text-xs font-medium text-stone-600">
                      New password
                      <span className="relative mt-2 block">
                        <input
                          required
                          minLength={8}
                          type={showNew ? "text" : "password"}
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          className="h-11 w-full rounded-md border border-[#EAE6DF] pl-3 pr-10 text-sm text-[#1C1A18] outline-none focus:border-[#9E5A44] focus:ring-2 focus:ring-[#9E5A44]/10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                          tabIndex={-1}
                        >
                          {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </span>
                    </label>
                    <label className="text-xs font-medium text-stone-600">
                      Confirm new password
                      <input
                        required
                        minLength={8}
                        type={showNew ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className="mt-2 h-11 w-full rounded-md border border-[#EAE6DF] px-3 text-sm text-[#1C1A18] outline-none focus:border-[#9E5A44] focus:ring-2 focus:ring-[#9E5A44]/10"
                      />
                    </label>
                    <p className="text-[11px] text-stone-400 sm:col-span-2">Use at least 8 characters.</p>
                    <div className="sm:col-span-2 flex items-center justify-end gap-2">
                      <PremiumButton
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setCurrentPassword("");
                          setNewPassword("");
                          setConfirmPassword("");
                        }}
                      >
                        Cancel
                      </PremiumButton>
                      <PremiumButton type="submit" loading={changingPassword}>
                        <KeyRound className="size-4" /> Update password
                      </PremiumButton>
                    </div>
                  </form>
                )}
              </SectionCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}
