"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/atelier/_portal";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { apiErrorMessage, apiPatch, apiPost } from "@/lib/api";
import type { FreelancerProfile } from "./types";

const SPECIALTIES = ["Beader", "Embroiderer", "Cutter", "Tailor", "Designer", "Photographer", "Other"];
const input = "h-10 w-full rounded-md border border-[#D8DEE7] bg-white px-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";
const label = "mb-1 block text-xs font-medium text-stone-500";

export function ProfilePanel({
  profile,
  onChange,
  onLogout,
}: {
  profile: FreelancerProfile;
  onChange: (p: FreelancerProfile) => void;
  onLogout: () => void;
}) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [specialty, setSpecialty] = useState(profile.specialty ?? "");
  const [skills, setSkills] = useState(profile.skills ?? "");
  const [saving, setSaving] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await apiPatch<FreelancerProfile>("/api/freelancer-auth/me", { fullName, phone, specialty, skills });
      onChange(updated);
      toast.success("Profile saved.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not save your profile."));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) return toast.error("New password must be at least 8 characters.");
    if (next !== confirm) return toast.error("The new passwords don't match.");
    setPwBusy(true);
    try {
      await apiPost("/api/auth/change-password", { currentPassword: current, newPassword: next });
      toast.success("Password updated.");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not update your password."));
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Account" title="Your profile" subtitle="Studios see your name, specialty and skills when they look for freelancers." />
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard>
          <h3 className="mb-4 text-sm font-semibold text-[#0F172A]">Public profile</h3>
          <form onSubmit={saveProfile} className="space-y-4">
            <div><label className={label} htmlFor="p-name">Full name</label>
              <input id="p-name" required className={input} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" /></div>
            <div><label className={label} htmlFor="p-email">Email</label>
              <input id="p-email" className={`${input} bg-slate-50 text-stone-500`} value={profile.email} disabled /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label} htmlFor="p-phone">Phone</label>
                <input id="p-phone" type="tel" className={input} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></div>
              <div><label className={label} htmlFor="p-spec">Specialty</label>
                <select id="p-spec" className={input} value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                  <option value="">Select…</option>
                  {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select></div>
            </div>
            <div><label className={label} htmlFor="p-skills">Skills</label>
              <input id="p-skills" className={input} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. hand beading, gele tying" maxLength={300} /></div>
            <PremiumButton type="submit" loading={saving}>Save changes</PremiumButton>
          </form>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard>
            <h3 className="mb-4 text-sm font-semibold text-[#0F172A]">Change password</h3>
            <form onSubmit={changePassword} className="space-y-3">
              <input type="password" className={input} placeholder="Current password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
              <input type="password" className={input} placeholder="New password (8+ characters)" autoComplete="new-password" minLength={8} required value={next} onChange={(e) => setNext(e.target.value)} />
              <input type="password" className={input} placeholder="Confirm new password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              <PremiumButton type="submit" variant="outline" loading={pwBusy}>Update password</PremiumButton>
            </form>
          </SectionCard>
          <SectionCard>
            <PremiumButton variant="ghost" onClick={onLogout}><LogOut className="size-4" /> Sign out</PremiumButton>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
