"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Mail, Phone, Save, UserRound } from "lucide-react";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { SectionCard } from "@/components/atelier/SectionCard";
import { apiGet } from "@/lib/api";
import { useAuth, type AuthUser } from "@/stores/auth";
import { useNav } from "@/stores/nav";

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

export default function UserProfile() {
  const { selectedId, go } = useNav();
  const { user: currentUser, updateProfile } = useAuth();
  const isSelf = !selectedId || selectedId === currentUser?.id;
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [saving, setSaving] = useState(false);

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
  }, [profileQuery.data]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ fullName, phone: phone.trim() || null, gender: gender || null });
      await profileQuery.refetch();
      toast.success("Profile updated.");
    } catch {
      toast.error("Could not update your profile.");
    } finally {
      setSaving(false);
    }
  }

  const profile = profileQuery.data;

  return (
    <div className="mx-auto w-full max-w-[900px] p-5 md:p-8">
      {selectedId && (
        <button onClick={() => go("team")} className="mb-5 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-[#800020]">
          <ArrowLeft className="size-4" /> Team
        </button>
      )}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#800020] text-white">
          <UserRound className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Account</p>
          <h1 className="font-display text-2xl font-semibold text-[#1C1917]">{isSelf ? "My profile" : "Team profile"}</h1>
        </div>
      </div>

      {profileQuery.isLoading ? (
        <p className="py-10 text-sm text-stone-400">Loading profile…</p>
      ) : profileQuery.isError || !profile ? (
        <SectionCard title="Profile unavailable">
          <p className="text-sm text-stone-500">This profile could not be loaded or you do not have permission to view it.</p>
          <PremiumButton className="mt-4" variant="outline" onClick={() => profileQuery.refetch()}>Try again</PremiumButton>
        </SectionCard>
      ) : (
        <SectionCard title={profile.fullName}>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#800020]/15 bg-[#800020]/5 px-3 py-1 text-xs font-medium text-[#800020]">
              {ROLE_NAMES[profile.role] || profile.role}
            </span>
            {profile.shop?.name && <span className="text-xs text-stone-500">{profile.shop.name}</span>}
          </div>

          {isSelf ? (
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-stone-600">
                Full name
                <input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#E7E5E4] px-3 text-sm text-[#1C1917] outline-none focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/10" />
              </label>
              <label className="text-xs font-medium text-stone-600">
                Email
                <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-[#E7E5E4] bg-stone-50 px-3 text-sm font-normal text-stone-500"><Mail className="size-4" />{profile.email}</span>
              </label>
              <label className="text-xs font-medium text-stone-600">
                Phone
                <span className="relative mt-2 block">
                  <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
                  <input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="h-11 w-full rounded-md border border-[#E7E5E5] pl-9 pr-3 text-sm text-[#1C1917] outline-none focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/10" />
                </span>
              </label>
              <label className="text-xs font-medium text-stone-600">
                Gender
                <select value={gender} onChange={(event) => setGender(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#E7E5E4] bg-white px-3 text-sm text-[#1C1917] outline-none focus:border-[#800020]">
                  <option value="">Not specified</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <div className="sm:col-span-2">
                <PremiumButton type="submit" loading={saving}>
                  <Save className="size-4" /> Save profile
                </PremiumButton>
              </div>
            </form>
          ) : (
            <dl className="grid gap-5 sm:grid-cols-2">
              <div><dt className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Email</dt><dd className="mt-1 text-sm text-[#1C1917]">{profile.email}</dd></div>
              <div><dt className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Phone</dt><dd className="mt-1 text-sm text-[#1C1917]">{profile.phone || "Not provided"}</dd></div>
              <div><dt className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Gender</dt><dd className="mt-1 text-sm text-[#1C1917]">{profile.gender || "Not provided"}</dd></div>
              {profile.trainingDurationWeeks && <div><dt className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Training duration</dt><dd className="mt-1 text-sm text-[#1C1917]">{profile.trainingDurationWeeks} weeks</dd></div>}
            </dl>
          )}
        </SectionCard>
      )}
    </div>
  );
}