"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UsersRound,
  UserPlus,
  Mail,
  Phone,
  Plus,
  Trash2,
  Scissors,
  Sparkles,
  Flower2,
  Shirt,
  PenTool,
  Camera,
  Briefcase,
  GraduationCap,
  Crown,
} from "lucide-react";

import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumMetric } from "@/components/atelier/PremiumMetric";
import { AnimatedNumber } from "@/components/atelier/AnimatedNumber";
import { EmptyState, SkeletonList } from "@/components/atelier/EmptyState";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { StatusBadge } from "@/components/atelier/StatusBadge";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { Freelancer, User } from "@/lib/types";
import { useAuth } from "@/stores/auth";

/* ----------------------------- constants ----------------------------- */

const ROLE_OPTIONS = ["staff", "trainer", "trainee"] as const;
const GENDER_OPTIONS = ["Female", "Male", "Other", "Prefer not to say"] as const;
const SPECIALTIES = [
  "Beader",
  "Embroiderer",
  "Cutter",
  "Tailor",
  "Designer",
  "Photographer",
  "Other",
] as const;
const FREELANCER_STATUSES = ["Available", "Busy", "Unavailable"] as const;

const SPECIALTY_ICON: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Beader: Sparkles,
  Embroiderer: Flower2,
  Cutter: Scissors,
  Tailor: Shirt,
  Designer: PenTool,
  Photographer: Camera,
  Other: Briefcase,
};

const ROLE_ORDER: Record<string, number> = {
  madam: 0,
  staff: 1,
  trainer: 2,
  trainee: 3,
};

function roleLabel(role: string): string {
  if (role === "madam") return "Madam";
  if (!role) return "Staff";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function initialOf(name: string): string {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

/* =============================== Team =============================== */

export default function Team() {
  const { user: owner } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("staff");
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addFreelancerOpen, setAddFreelancerOpen] = useState(false);

  const usersQ = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiGet<User[]>("/api/users"),
  });
  const freelancersQ = useQuery<Freelancer[]>({
    queryKey: ["freelancers"],
    queryFn: () => apiGet<Freelancer[]>("/api/freelancers"),
  });

  const users = usersQ.data ?? [];
  const freelancers = freelancersQ.data ?? [];

  const stats = useMemo(
    () => ({
      staff: users.filter((u) => u.role === "staff").length,
      trainers: users.filter((u) => u.role === "trainer").length,
      freelancers: freelancers.length,
      available: freelancers.filter((f) => f.status === "Available").length,
    }),
    [users, freelancers]
  );

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
      <PageHeader
        eyebrow="Atelier people"
        eyebrowIcon={UsersRound}
        title="Team"
        subtitle="Manage staff, trainers and the freelancers you commission."
        actions={
          owner ? (
            <div className="hidden md:flex items-center gap-2 rounded-full border border-[#E7E5E4] bg-white pl-2 pr-3 py-1.5 elevate-sm">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#800020] to-[#6b0018] flex items-center justify-center text-white text-[11px] font-display font-semibold">
                {initialOf(owner.fullName)}
              </span>
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                  Owner
                </div>
                <div className="text-xs font-medium text-[#1C1917]">
                  {owner.fullName}
                </div>
              </div>
            </div>
          ) : undefined
        }
      />

      {/* Premium stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PremiumMetric
          label="Staff"
          value={<AnimatedNumber value={stats.staff} />}
          icon={UsersRound}
          accent
        />
        <PremiumMetric
          label="Trainers"
          value={<AnimatedNumber value={stats.trainers} />}
          icon={GraduationCap}
        />
        <PremiumMetric
          label="Freelancers"
          value={<AnimatedNumber value={stats.freelancers} />}
          icon={Briefcase}
        />
        <PremiumMetric
          label="Available"
          value={<AnimatedNumber value={stats.available} />}
          icon={Sparkles}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-white border border-[#E7E5E4] rounded-lg h-auto p-1 overflow-x-auto max-w-full inline-flex w-auto gap-0.5">
          <TabsTrigger
            value="staff"
            className="rounded-md data-[state=active]:bg-[#800020] data-[state=active]:text-white data-[state=active]:shadow-sm px-4 py-1.5 text-sm font-medium text-stone-600 whitespace-nowrap"
          >
            Staff &amp; Trainers
          </TabsTrigger>
          <TabsTrigger
            value="freelancers"
            className="rounded-md data-[state=active]:bg-[#800020] data-[state=active]:text-white data-[state=active]:shadow-sm px-4 py-1.5 text-sm font-medium text-stone-600 whitespace-nowrap"
          >
            Freelancers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-5">
          <StaffTrainersCard
            users={users}
            isLoading={usersQ.isLoading}
            ownerId={owner?.id}
            onAdd={() => setAddMemberOpen(true)}
          />
        </TabsContent>

        <TabsContent value="freelancers" className="mt-5">
          <FreelancersCard
            freelancers={freelancers}
            isLoading={freelancersQ.isLoading}
            onAdd={() => setAddFreelancerOpen(true)}
          />
        </TabsContent>
      </Tabs>

      <AddMemberDialog
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        onDone={() => qc.invalidateQueries({ queryKey: ["users"] })}
      />
      <AddFreelancerDialog
        open={addFreelancerOpen}
        onOpenChange={setAddFreelancerOpen}
        onDone={() => qc.invalidateQueries({ queryKey: ["freelancers"] })}
      />
    </div>
  );
}

/* ======================= Staff & Trainers card ======================= */

function StaffTrainersCard({
  users,
  isLoading,
  ownerId,
  onAdd,
}: {
  users: User[];
  isLoading: boolean;
  ownerId?: string;
  onAdd: () => void;
}) {
  const sorted = useMemo(() => {
    return [...users].sort((a, b) => {
      const ao = ROLE_ORDER[a.role] ?? 9;
      const bo = ROLE_ORDER[b.role] ?? 9;
      if (ao !== bo) return ao - bo;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [users]);

  return (
    <SectionCard
      title={`Atelier Roster · ${users.length}`}
      bodyClassName="p-0"
      action={
        <PremiumButton size="sm" onClick={onAdd}>
          <UserPlus className="w-4 h-4" /> Add Member
        </PremiumButton>
      }
    >
      {isLoading ? (
        <SkeletonList rows={4} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No members yet"
          description="Add your first staff member or trainer to start building the atelier roster."
          action={
            <PremiumButton size="sm" onClick={onAdd}>
              <UserPlus className="w-4 h-4" /> Add Member
            </PremiumButton>
          }
        />
      ) : (
        <div className="divide-y divide-[#E7E5E4]/70">
          {sorted.map((u) => {
            const isOwner = u.role === "madam";
            const isMe = ownerId === u.id;
            return (
              <div
                key={u.id}
                className="group flex items-center gap-4 px-5 py-4 hover:bg-[#faf8f5] transition-colors"
              >
                <div
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-[#800020] to-[#6b0018] flex items-center justify-center text-white font-display font-semibold text-lg shrink-0 shadow-sm"
                  aria-hidden
                >
                  {initialOf(u.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[#1C1917] truncate">
                      {u.fullName}
                    </span>
                    {isOwner && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#800020] bg-[#800020]/8 border border-[#800020]/15 px-1.5 py-0.5 rounded-md">
                        <Crown className="w-3 h-3" /> Owner
                      </span>
                    )}
                    {isMe && !isOwner && (
                      <span className="inline-flex items-center text-[10px] font-medium uppercase tracking-[0.18em] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-md">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 mt-1">
                    {u.email && (
                      <span className="inline-flex items-center gap-1 truncate max-w-[220px]">
                        <Mail className="w-3 h-3 shrink-0" /> {u.email}
                      </span>
                    )}
                    {u.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {u.phone}
                      </span>
                    )}
                    {u.gender && (
                      <span className="inline-flex items-center rounded-md bg-[#FBF9F7] border border-[#E7E5E4] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-stone-500">
                        {u.gender}
                      </span>
                    )}
                    {!u.email && !u.phone && !u.gender && (
                      <span className="italic text-stone-400">
                        No contact details
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={roleLabel(u.role)} />
                  {isOwner && (
                    <span className="hidden sm:inline text-[10px] uppercase tracking-[0.18em] text-stone-300">
                      Permanent
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

/* ========================== Freelancers card ========================= */

function FreelancersCard({
  freelancers,
  isLoading,
  onAdd,
}: {
  freelancers: Freelancer[];
  isLoading: boolean;
  onAdd: () => void;
}) {
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch<Freelancer>(`/api/freelancers/${id}`, { status }),
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: ["freelancers"] });
      toast.success(`${f.name} is now ${f.status}`);
    },
    onError: () => toast.error("Could not update status."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/freelancers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["freelancers"] });
      toast.success("Freelancer removed from roster.");
      setDeleteId(null);
    },
    onError: () => toast.error("Could not remove freelancer."),
  });

  const target = freelancers.find((f) => f.id === deleteId) || null;

  return (
    <SectionCard
      title={`Commissioned Talent · ${freelancers.length}`}
      bodyClassName="p-0"
      action={
        <PremiumButton size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4" /> Add Freelancer
        </PremiumButton>
      }
    >
      {isLoading ? (
        <SkeletonList rows={4} />
      ) : freelancers.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No freelancers yet"
          description="Add the beaders, embroiderers, cutters and tailors you commission for bespoke work."
          action={
            <PremiumButton size="sm" onClick={onAdd}>
              <Plus className="w-4 h-4" /> Add Freelancer
            </PremiumButton>
          }
        />
      ) : (
        <div className="divide-y divide-[#E7E5E4]/70">
          {freelancers.map((f) => {
            const SpecialtyIcon =
              SPECIALTY_ICON[f.specialty || "Other"] || Briefcase;
            return (
              <div
                key={f.id}
                className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4 hover:bg-[#faf8f5] transition-colors"
              >
                <div
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-[#800020] to-[#6b0018] flex items-center justify-center text-white shrink-0 shadow-sm"
                  aria-hidden
                >
                  <SpecialtyIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[#1C1917] truncate">
                      {f.name}
                    </span>
                    {f.specialty && (
                      <span className="inline-flex items-center rounded-md bg-[#800020]/8 text-[#800020] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] border border-[#800020]/15">
                        {f.specialty}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 mt-1">
                    {f.skills && (
                      <span className="italic text-stone-400 truncate max-w-[280px]">
                        {f.skills}
                      </span>
                    )}
                    {f.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {f.phone}
                      </span>
                    )}
                    {f.email && (
                      <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                        <Mail className="w-3 h-3 shrink-0" /> {f.email}
                      </span>
                    )}
                    {!f.skills && !f.phone && !f.email && (
                      <span className="italic text-stone-400">
                        No contact details
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pl-14 sm:pl-0">
                  <div className="text-right">
                    <div className="font-display font-semibold text-[#1C1917] tabular-nums text-sm leading-none">
                      {f.rate ? formatCurrency(f.rate) : "—"}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-stone-400 mt-1">
                      per piece
                    </div>
                  </div>
                  <StatusBadge status={f.status} />
                  <Select
                    value={f.status}
                    onValueChange={(v) =>
                      statusMutation.mutate({ id: f.id, status: v })
                    }
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-[130px] bg-white border-[#E7E5E4] rounded-md h-9"
                      disabled={statusMutation.isPending}
                      aria-label={`Change status for ${f.name}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREELANCER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <PremiumButton
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(f.id)}
                    aria-label={`Remove ${f.name}`}
                    className="text-stone-400 hover:text-[#b91c1c] hover:bg-[#b91c1c]/8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </PremiumButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove freelancer?</AlertDialogTitle>
            <AlertDialogDescription>
              {target
                ? `This will permanently remove ${target.name} from your roster. This action cannot be undone.`
                : "This will permanently remove the freelancer from your roster. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#b91c1c] hover:bg-[#991b1b] text-white border-[#b91c1c]"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  );
}

/* ========================= Add Member Dialog ======================== */

interface MemberForm {
  fullName: string;
  email: string;
  role: string;
  gender: string;
  phone: string;
  password: string;
}

const EMPTY_MEMBER: MemberForm = {
  fullName: "",
  email: "",
  role: "staff",
  gender: "",
  phone: "",
  password: "atelier2025",
};

function AddMemberDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState<MemberForm>(EMPTY_MEMBER);

  const createMutation = useMutation({
    mutationFn: (body: MemberForm) => apiPost<User>("/api/users", body),
    onSuccess: (u) => {
      toast.success(`${u.fullName} added to the atelier.`, {
        description: `Signed in as ${u.role}. Default password: ${form.password || "atelier2025"}.`,
      });
      onDone();
      setForm(EMPTY_MEMBER);
      onOpenChange(false);
    },
    onError: (err: Error) => {
      const msg = err.message || "";
      if (msg.includes("409")) {
        toast.error("That email is already in use.", {
          description: "Try a different email address.",
        });
      } else {
        toast.error("Could not add member.", { description: msg });
      }
    },
  });

  const set = <K extends keyof MemberForm>(k: K, v: MemberForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valid = form.fullName.trim().length > 0 && form.email.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    createMutation.mutate(form);
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      // reset on close if not submitting
      if (!createMutation.isPending) setForm(EMPTY_MEMBER);
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add atelier member</DialogTitle>
          <DialogDescription>
            Create a sign-in for a staff member, trainer, or trainee.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Full Name" required>
              <Input
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                placeholder="e.g. Akosua Mensah"
                className="h-10 bg-white border-[#E7E5E4] rounded-md"
                required
                autoFocus
              />
            </Field>
            <Field label="Email" required>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="name@studio.com"
                className="h-10 bg-white border-[#E7E5E4] rounded-md"
                required
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Role">
              <Select
                value={form.role}
                onValueChange={(v) => set("role", v)}
              >
                <SelectTrigger className="h-10 bg-white border-[#E7E5E4] rounded-md w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Gender">
              <Select
                value={form.gender}
                onValueChange={(v) => set("gender", v)}
              >
                <SelectTrigger className="h-10 bg-white border-[#E7E5E4] rounded-md w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+233 …"
                className="h-10 bg-white border-[#E7E5E4] rounded-md"
              />
            </Field>
            <Field label="Password">
              <Input
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="atelier2025"
                className="h-10 bg-white border-[#E7E5E4] rounded-md tabular-nums"
              />
            </Field>
          </div>
          <p className="text-[11px] text-stone-400 -mt-1">
            Default password is{" "}
            <span className="font-medium text-stone-500">atelier2025</span>. The
            member can sign in and you can change it later from the database.
          </p>

          <DialogFooter>
            <PremiumButton
              type="button"
              variant="outline"
              size="md"
              onClick={() => handleOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </PremiumButton>
            <PremiumButton
              type="submit"
              variant="primary"
              size="md"
              loading={createMutation.isPending}
              disabled={!valid}
            >
              <UserPlus className="w-4 h-4" /> Add member
            </PremiumButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ======================= Add Freelancer Dialog ====================== */

interface FreelancerForm {
  name: string;
  specialty: string;
  skills: string;
  phone: string;
  email: string;
  rate: string;
  status: string;
  notes: string;
}

const EMPTY_FREELANCER: FreelancerForm = {
  name: "",
  specialty: "Beader",
  skills: "",
  phone: "",
  email: "",
  rate: "",
  status: "Available",
  notes: "",
};

function AddFreelancerDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState<FreelancerForm>(EMPTY_FREELANCER);

  const createMutation = useMutation({
    mutationFn: (body: FreelancerForm) =>
      apiPost<Freelancer>("/api/freelancers", {
        name: body.name,
        specialty: body.specialty,
        skills: body.skills || null,
        phone: body.phone || null,
        email: body.email || null,
        rate: body.rate ? Number(body.rate) : null,
        status: body.status,
        notes: body.notes || null,
      }),
    onSuccess: (f) => {
      toast.success(`${f.name} added to your freelancer roster.`, {
        description: f.specialty ? `${f.specialty} · ${f.status}` : f.status,
      });
      onDone();
      setForm(EMPTY_FREELANCER);
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Could not add freelancer.", {
        description: err.message,
      });
    },
  });

  const set = <K extends keyof FreelancerForm>(k: K, v: FreelancerForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valid = form.name.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    createMutation.mutate(form);
  }

  function handleOpenChange(v: boolean) {
    if (!v && !createMutation.isPending) setForm(EMPTY_FREELANCER);
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add freelancer</DialogTitle>
          <DialogDescription>
            Commission a beader, embroiderer, cutter, tailor or other
            specialist for bespoke work.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name" required>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Adwoa Beads"
                className="h-10 bg-white border-[#E7E5E4] rounded-md"
                required
                autoFocus
              />
            </Field>
            <Field label="Specialty">
              <Select
                value={form.specialty}
                onValueChange={(v) => set("specialty", v)}
              >
                <SelectTrigger className="h-10 bg-white border-[#E7E5E4] rounded-md w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Skills">
            <Input
              value={form.skills}
              onChange={(e) => set("skills", e.target.value)}
              placeholder="Comma-separated, e.g. pearl threading, bead embroidery"
              className="h-10 bg-white border-[#E7E5E4] rounded-md"
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+233 …"
                className="h-10 bg-white border-[#E7E5E4] rounded-md"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="name@example.com"
                className="h-10 bg-white border-[#E7E5E4] rounded-md"
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Rate (GHS)">
              <Input
                type="number"
                min="0"
                step="1"
                value={form.rate}
                onChange={(e) => set("rate", e.target.value)}
                placeholder="e.g. 150"
                className="h-10 bg-white border-[#E7E5E4] rounded-md tabular-nums"
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v)}
              >
                <SelectTrigger className="h-10 bg-white border-[#E7E5E4] rounded-md w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREELANCER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Lead time, preferred fabrics, payment terms…"
              className="bg-white border-[#E7E5E4] rounded-md min-h-[80px] resize-y"
            />
          </Field>

          <DialogFooter>
            <PremiumButton
              type="button"
              variant="outline"
              size="md"
              onClick={() => handleOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </PremiumButton>
            <PremiumButton
              type="submit"
              variant="primary"
              size="md"
              loading={createMutation.isPending}
              disabled={!valid}
            >
              <Plus className="w-4 h-4" /> Add freelancer
            </PremiumButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ Field ------------------------------ */

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500 flex items-center gap-1">
        {label}
        {required && <span className="text-[#800020]">*</span>}
      </Label>
      {children}
    </div>
  );
}
