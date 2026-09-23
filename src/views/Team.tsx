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
  ArrowRight,
  Pencil,
  CalendarDays,
  Clock,
  Lock,
  ShieldCheck,
  ShoppingBag,
  LayoutGrid,
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
import { Switch } from "@/components/ui/switch";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Freelancer, FreelanceJob, TrainingLog, TrainingProgram, User } from "@/lib/types";
import { useAuth } from "@/stores/auth";
import { useNav } from "@/stores/nav";
import { useRole } from "@/stores/role";

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

/** Weeks elapsed since training started (floor of days/7). 0 if not started. */
function weeksElapsedFromStart(startedAt: string | null | undefined): number {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  if (isNaN(start)) return 0;
  const diff = Date.now() - start;
  if (diff < 0) return 0;
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

/** Convert an ISO date string to a "YYYY-MM-DD" value for <input type="date">. */
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Sentinel value used by the mentor Select to mean "Unassigned". */
const UNASSIGNED_MENTOR = "__none";
const NO_PROGRAM = "__no_program";

/* =============================== Team =============================== */

export default function Team() {
  const { user: owner } = useAuth();
  const role = useRole();
  const canEditTrainees = role.isOwner() || role.isTrainer();
  const { go } = useNav();
  const qc = useQueryClient();
  const [tab, setTab] = useState("staff");
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addTraineeOpen, setAddTraineeOpen] = useState(false);
  const [addFreelancerOpen, setAddFreelancerOpen] = useState(false);

  const usersQ = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiGet<User[]>("/api/users"),
  });
  const freelancersQ = useQuery<Freelancer[]>({
    queryKey: ["freelancers"],
    queryFn: () => apiGet<Freelancer[]>("/api/freelancers"),
  });
  const trainingLogsQ = useQuery<TrainingLog[]>({
    queryKey: ["training-logs"],
    queryFn: () => apiGet<TrainingLog[]>("/api/training-logs"),
  });

  const permissionMutation = useMutation({
    mutationFn: ({ id, canManageFreelancers }: { id: string; canManageFreelancers: boolean }) =>
      apiPatch<User>(`/api/users/${id}`, { canManageFreelancers }),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(
        u.canManageFreelancers
          ? `${u.fullName} can now manage freelancers.`
          : `${u.fullName}'s freelancer access was revoked.`
      );
    },
    onError: () => toast.error("Could not update permission."),
  });

  const users = usersQ.data ?? [];
  const freelancers = freelancersQ.data ?? [];
  const trainingLogs = trainingLogsQ.data ?? [];

  const stats = useMemo(
    () => ({
      staff: users.filter((u) => u.role === "staff").length,
      trainers: users.filter((u) => u.role === "trainer").length,
      trainees: users.filter((u) => u.role === "trainee").length,
      freelancers: freelancers.length,
    }),
    [users, freelancers]
  );

  const mentors = useMemo(
    () =>
      users
        .filter((u) => u.role === "trainer" || u.role === "madam")
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [users]
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
          label="Trainees"
          value={<AnimatedNumber value={stats.trainees} />}
          icon={GraduationCap}
        />
        <PremiumMetric
          label="Freelancers"
          value={<AnimatedNumber value={stats.freelancers} />}
          icon={Briefcase}
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
            value="trainees"
            className="rounded-md data-[state=active]:bg-[#800020] data-[state=active]:text-white data-[state=active]:shadow-sm px-4 py-1.5 text-sm font-medium text-stone-600 whitespace-nowrap"
          >
            Trainees
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
            isOwnerViewer={role.isOwner()}
            onToggleFreelancerAccess={(id, v) =>
              permissionMutation.mutate({ id, canManageFreelancers: v })
            }
            togglingId={
              permissionMutation.isPending
                ? permissionMutation.variables?.id
                : null
            }
          />
        </TabsContent>

        <TabsContent value="trainees" className="mt-5">
          <TraineesCard
            users={users}
            logs={trainingLogs}
            mentors={mentors}
            canEdit={canEditTrainees}
            isOwnerViewer={role.isOwner()}
            isLoading={usersQ.isLoading || trainingLogsQ.isLoading}
            onAdd={() => setAddTraineeOpen(true)}
            onView={(id) => go("progress", { id })}
          />
        </TabsContent>

        <TabsContent value="freelancers" className="mt-5 space-y-5">
          <FreelancersCard
            freelancers={freelancers}
            isLoading={freelancersQ.isLoading}
            onAdd={() => setAddFreelancerOpen(true)}
          />
          <FreelanceJobsSection freelancers={freelancers} />
        </TabsContent>
      </Tabs>

      <AddMemberDialog
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        onDone={() => qc.invalidateQueries({ queryKey: ["users"] })}
      />
      <AddTraineeDialog
        open={addTraineeOpen}
        onOpenChange={setAddTraineeOpen}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["users"] });
          qc.invalidateQueries({ queryKey: ["training-logs"] });
        }}
        mentors={mentors}
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
  isOwnerViewer,
  onToggleFreelancerAccess,
  togglingId,
}: {
  users: User[];
  isLoading: boolean;
  ownerId?: string;
  onAdd: () => void;
  isOwnerViewer: boolean;
  onToggleFreelancerAccess: (id: string, value: boolean) => void;
  togglingId?: string | null;
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
                <div className="flex items-center gap-3 shrink-0">
                  {!isOwner && isOwnerViewer && (
                    <label className="hidden md:flex items-center gap-2 text-xs text-stone-500 cursor-pointer">
                      <Switch
                        checked={!!u.canManageFreelancers}
                        onCheckedChange={(v) =>
                          onToggleFreelancerAccess(u.id, v)
                        }
                        disabled={togglingId === u.id}
                        aria-label={`Freelancer access for ${u.fullName}`}
                      />
                      Freelancers
                    </label>
                  )}
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
    mutationFn: ({ linkId, status }: { linkId: string; status: string }) =>
      apiPatch<Freelancer>(`/api/freelancers/${linkId}`, { status }),
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: ["freelancers"] });
      toast.success(`${f.name} is now ${f.status}`);
    },
    onError: () => toast.error("Could not update status."),
  });

  const deleteMutation = useMutation({
    mutationFn: (linkId: string) => apiDelete(`/api/freelancers/${linkId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["freelancers"] });
      toast.success("Freelancer removed from roster.");
      setDeleteId(null);
    },
    onError: () => toast.error("Could not remove freelancer."),
  });

  const target = freelancers.find((f) => f.linkId === deleteId) || null;

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
                key={f.linkId}
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
                  {f.rateNotes && (
                    <div
                      className="hidden lg:block text-xs text-stone-500 italic max-w-[180px] truncate"
                      title={f.rateNotes}
                    >
                      {f.rateNotes}
                    </div>
                  )}
                  <StatusBadge status={f.status} />
                  <Select
                    value={f.status}
                    onValueChange={(v) =>
                      statusMutation.mutate({ linkId: f.linkId, status: v })
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
                    onClick={() => setDeleteId(f.linkId)}
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

/* ========================== Trainees card =========================== */

interface TraineeStats {
  total: number;
  proficient: number;
  practicing: number;
  learning: number;
  mentor?: string;
}

function TraineesCard({
  users,
  logs,
  mentors,
  isLoading,
  canEdit,
  isOwnerViewer,
  onAdd,
  onView,
}: {
  users: User[];
  logs: TrainingLog[];
  mentors: User[];
  isLoading: boolean;
  canEdit: boolean;
  isOwnerViewer: boolean;
  onAdd: () => void;
  onView: (id: string) => void;
}) {
  const [editTrainee, setEditTrainee] = useState<User | null>(null);

  const trainees = useMemo(
    () =>
      users
        .filter((u) => u.role === "trainee")
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [users]
  );

  // Match mentorId → user client-side (GET /api/users does not include mentor relation).
  const userById = useMemo(() => {
    const map = new Map<string, User>();
    for (const u of users) map.set(u.id, u);
    return map;
  }, [users]);

  const statsByTrainee = useMemo(() => {
    const map = new Map<string, TraineeStats>();
    for (const log of logs) {
      const s =
        map.get(log.traineeId) ?? {
          total: 0,
          proficient: 0,
          practicing: 0,
          learning: 0,
        };
      s.total += 1;
      if (log.status === "Proficient") s.proficient += 1;
      else if (log.status === "Practicing") s.practicing += 1;
      else s.learning += 1;
      if (!s.mentor && log.mentor?.fullName) s.mentor = log.mentor.fullName;
      map.set(log.traineeId, s);
    }
    return map;
  }, [logs]);

  return (
    <>
      <SectionCard
        title={`Apprentices · ${trainees.length}`}
        bodyClassName="p-0"
        action={
          <PremiumButton size="sm" onClick={onAdd}>
            <GraduationCap className="w-4 h-4" /> Add Trainee
          </PremiumButton>
        }
      >
        {isLoading ? (
          <SkeletonList rows={3} />
        ) : trainees.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No trainees yet"
            description="Add your first apprentice — start tracking their skill journey from the Progress view."
            action={
              <PremiumButton size="sm" onClick={onAdd}>
                <GraduationCap className="w-4 h-4" /> Add Trainee
              </PremiumButton>
            }
          />
        ) : (
          <div className="divide-y divide-[#E7E5E4]/70">
            {trainees.map((t) => {
              const s = statsByTrainee.get(t.id);
              const mentorUser = t.mentorId
                ? userById.get(t.mentorId)
                : undefined;
              const mentorName =
                mentorUser?.fullName ??
                t.mentor?.fullName ??
                s?.mentor ??
                "";
              const weeksElapsed = weeksElapsedFromStart(t.trainingStartedAt);
              const durationWeeks = t.trainingDurationWeeks ?? 0;
              const hasSchedule =
                !!t.trainingStartedAt && durationWeeks > 0;
              const progressPct = hasSchedule
                ? Math.min(100, Math.round((weeksElapsed / durationWeeks) * 100))
                : 0;
              return (
                <div
                  key={t.id}
                  className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4 hover:bg-[#faf8f5] transition-colors"
                >
                  <div
                    className="w-11 h-11 rounded-full bg-gradient-to-br from-[#800020] to-[#6b0018] flex items-center justify-center text-white font-display font-semibold text-lg shrink-0 shadow-sm"
                    aria-hidden
                  >
                    {initialOf(t.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[#1C1917] truncate">
                        {t.fullName}
                      </span>
                      <StatusBadge status="Trainee" />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 mt-1">
                      {t.email && (
                        <span className="inline-flex items-center gap-1 truncate max-w-[220px]">
                          <Mail className="w-3 h-3 shrink-0" /> {t.email}
                        </span>
                      )}
                      {t.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {t.phone}
                        </span>
                      )}
                      {!t.email && !t.phone && (
                        <span className="italic text-stone-400">
                          No contact details
                        </span>
                      )}
                    </div>

                    {/* School-portal info — mentor · duration · started + Week X of Y */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <UsersRound className="w-3 h-3 shrink-0 text-stone-400" />
                        <span className="text-[10px] uppercase tracking-[0.14em] text-stone-400">
                          Mentor
                        </span>
                        {mentorName ? (
                          <span className="text-stone-700 font-medium truncate max-w-[160px]">
                            {mentorName}
                          </span>
                        ) : (
                          <span className="text-amber-700 italic">Unassigned</span>
                        )}
                      </span>

                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3 h-3 shrink-0 text-stone-400" />
                        <span className="text-[10px] uppercase tracking-[0.14em] text-stone-400">
                          Duration
                        </span>
                        {t.trainingDurationWeeks ? (
                          <span className="text-stone-700 tabular-nums font-medium">
                            {t.trainingDurationWeeks}{" "}
                            {t.trainingDurationWeeks === 1 ? "week" : "weeks"}
                          </span>
                        ) : (
                          <span className="text-amber-700 italic">Not set</span>
                        )}
                      </span>

                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="w-3 h-3 shrink-0 text-stone-400" />
                        <span className="text-[10px] uppercase tracking-[0.14em] text-stone-400">
                          Started
                        </span>
                        {t.trainingStartedAt ? (
                          <>
                            <span className="text-stone-700 tabular-nums">
                              {formatDate(t.trainingStartedAt)}
                            </span>
                            {t.trainingDurationWeeks ? (
                              <>
                                <span className="text-stone-300" aria-hidden>
                                  ·
                                </span>
                                <span className="inline-flex items-center gap-1 text-[#800020] font-medium">
                                  <span className="tabular-nums">
                                    Week {weeksElapsed}
                                  </span>
                                  <span className="text-stone-400 font-normal">
                                    of {t.trainingDurationWeeks}
                                  </span>
                                </span>
                              </>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-amber-700 italic">
                            Not started
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Burgundy progress bar — weeksElapsed / trainingDurationWeeks */}
                    {hasSchedule ? (
                      <div className="mt-2.5 max-w-[280px]">
                        <div
                          className="h-1.5 rounded-full bg-stone-200/70 overflow-hidden"
                          role="progressbar"
                          aria-valuenow={progressPct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${t.fullName} training progress`}
                        >
                          <div
                            className="h-full bg-gradient-to-r from-[#800020] to-[#a83349] rounded-full transition-all duration-500"
                            style={{
                              width: `${
                                progressPct === 0 ? 1 : progressPct
                              }%`,
                            }}
                          />
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-stone-400 tabular-nums">
                          {progressPct}% complete
                        </div>
                      </div>
                    ) : null}

                    {/* Existing training-log stats (kept) */}
                    <div className="mt-2 flex items-center gap-x-2.5 gap-y-1 text-[11px] flex-wrap">
                      {s && s.total > 0 ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-stone-500">
                            <span className="font-semibold text-stone-700 tabular-nums">
                              {s.total}
                            </span>
                            <span className="uppercase tracking-[0.14em]">
                              {s.total === 1 ? "log" : "logs"}
                            </span>
                          </span>
                          <span className="text-stone-300" aria-hidden>
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="font-semibold text-emerald-700 tabular-nums">
                              {s.proficient}
                            </span>
                            <span className="text-emerald-700/80">
                              Proficient
                            </span>
                          </span>
                          <span className="text-stone-300" aria-hidden>
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="font-semibold text-sky-700 tabular-nums">
                              {s.practicing}
                            </span>
                            <span className="text-sky-700/80">Practicing</span>
                          </span>
                          <span className="text-stone-300" aria-hidden>
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="font-semibold text-amber-700 tabular-nums">
                              {s.learning}
                            </span>
                            <span className="text-amber-700/80">Learning</span>
                          </span>
                        </>
                      ) : (
                        <span className="italic text-stone-400">
                          No logs yet
                        </span>
                      )}
                    </div>

                    {/* Studio access badges */}
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] uppercase tracking-[0.14em] text-stone-400">
                        Access:
                      </span>
                      {(t as any).canAccessOrders || (t as any).canAccessBoard ? (
                        <>
                          {(t as any).canAccessOrders && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#800020] bg-[#800020]/8 border border-[#800020]/15 rounded px-1.5 py-0.5">
                              <ShoppingBag className="w-2.5 h-2.5" /> Orders
                            </span>
                          )}
                          {(t as any).canAccessBoard && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#800020] bg-[#800020]/8 border border-[#800020]/15 rounded px-1.5 py-0.5">
                              <LayoutGrid className="w-2.5 h-2.5" /> Board
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-stone-400">
                          <Lock className="w-2.5 h-2.5" /> Tasks only
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0 pl-14 sm:pl-0">
                    {canEdit && (
                      <PremiumButton
                        variant="outline"
                        size="sm"
                        onClick={() => setEditTrainee(t)}
                        aria-label={`Edit profile for ${t.fullName}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Edit profile</span>
                      </PremiumButton>
                    )}
                    <PremiumButton
                      variant="outline"
                      size="sm"
                      onClick={() => onView(t.id)}
                      aria-label={`View progress for ${t.fullName}`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">View progress</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </PremiumButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <EditTraineeDialog
        key={editTrainee?.id ?? "closed"}
        open={!!editTrainee}
        onOpenChange={(o) => !o && setEditTrainee(null)}
        trainee={editTrainee}
        mentors={mentors}
        isOwnerViewer={isOwnerViewer}
      />
    </>
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

/* ======================== Add Trainee Dialog ======================== */

interface TraineeForm {
  fullName: string;
  email: string;
  mentorId: string; // assigns the mentor who can grade this trainee's work
  gender: string;
  phone: string;
  password: string;
}

const EMPTY_TRAINEE: TraineeForm = {
  fullName: "",
  email: "",
  mentorId: "",
  gender: "",
  phone: "",
  password: "atelier2025",
};

function AddTraineeDialog({
  open,
  onOpenChange,
  onDone,
  mentors,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
  mentors: User[];
}) {
  const [form, setForm] = useState<TraineeForm>(EMPTY_TRAINEE);

  const createMutation = useMutation({
    mutationFn: (body: TraineeForm) =>
      apiPost<User>("/api/users", {
        fullName: body.fullName,
        email: body.email,
        role: "trainee",
        gender: body.gender || undefined,
        phone: body.phone || undefined,
        password: body.password || "atelier2025",
        mentorId: body.mentorId || undefined,
      }),
    onSuccess: (u) => {
      toast.success(`${u.fullName} added as a trainee.`, {
        description: `Default password: ${form.password || "atelier2025"}.`,
      });
      onDone();
      setForm(EMPTY_TRAINEE);
      onOpenChange(false);
    },
    onError: (err: Error) => {
      const msg = err.message || "";
      if (msg.includes("409")) {
        toast.error("That email is already in use.", {
          description: "Try a different email address.",
        });
      } else {
        toast.error("Could not add trainee.", { description: msg });
      }
    },
  });

  const set = <K extends keyof TraineeForm>(k: K, v: TraineeForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valid = form.fullName.trim().length > 0 && form.email.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    createMutation.mutate(form);
  }

  function handleOpenChange(v: boolean) {
    if (!v && !createMutation.isPending) setForm(EMPTY_TRAINEE);
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add trainee</DialogTitle>
          <DialogDescription>
            Create an apprenticeship sign-in. Log their skill progress from the
            Progress view.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Full Name" required>
              <Input
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                placeholder="e.g. Ama Mensah"
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

          <Field label="Mentor">
            <Select
              value={form.mentorId}
              onValueChange={(v) => set("mentorId", v)}
            >
              <SelectTrigger className="h-10 bg-white border-[#E7E5E4] rounded-md w-full">
                <SelectValue placeholder="Assign a mentor" />
              </SelectTrigger>
              <SelectContent>
                {mentors.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No trainers or madam available
                  </SelectItem>
                ) : (
                  mentors.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.fullName} · {roleLabel(m.role)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>
          <p className="text-[11px] text-stone-400 -mt-2">
            The assigned mentor is the only trainer who can grade this
            trainee&rsquo;s tasks. You can change this later from Team →
            Edit trainee profile.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
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
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+233 …"
                className="h-10 bg-white border-[#E7E5E4] rounded-md"
              />
            </Field>
          </div>

          <Field label="Password">
            <Input
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="atelier2025"
              className="h-10 bg-white border-[#E7E5E4] rounded-md tabular-nums"
            />
          </Field>
          <p className="text-[11px] text-stone-400 -mt-1">
            Default password is{" "}
            <span className="font-medium text-stone-500">atelier2025</span>. The
            trainee can sign in and you can change it later.
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
              <GraduationCap className="w-4 h-4" /> Add trainee
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
  rateNotes: string;
  status: string;
  password: string;
}

const EMPTY_FREELANCER: FreelancerForm = {
  name: "",
  specialty: "Beader",
  skills: "",
  phone: "",
  email: "",
  rateNotes: "",
  status: "Available",
  password: "",
};

const JOB_STATUSES = ["Commissioned", "In Progress", "Delivered", "Paid"] as const;

function FreelanceJobsSection({ freelancers }: { freelancers: Freelancer[] }) {
  const qc = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);

  const jobsQ = useQuery<FreelanceJob[]>({
    queryKey: ["freelance-jobs"],
    queryFn: () => apiGet<FreelanceJob[]>("/api/freelance-jobs"),
  });
  const jobs = jobsQ.data ?? [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch<FreelanceJob>(`/api/freelance-jobs/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["freelance-jobs"] });
    },
    onError: () => toast.error("Could not update job status."),
  });

  return (
    <SectionCard
      title={`Freelance Jobs · ${jobs.length}`}
      bodyClassName="p-0"
      action={
        <PremiumButton
          size="sm"
          onClick={() => setAssignOpen(true)}
          disabled={freelancers.length === 0}
        >
          <Plus className="w-4 h-4" /> Assign Job
        </PremiumButton>
      }
    >
      {jobsQ.isLoading ? (
        <SkeletonList rows={3} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No freelance jobs yet"
          description={
            freelancers.length === 0
              ? "Add a freelancer first, then assign them work."
              : "Assign a piece of work to one of your freelancers."
          }
          action={
            <PremiumButton
              size="sm"
              onClick={() => setAssignOpen(true)}
              disabled={freelancers.length === 0}
            >
              <Plus className="w-4 h-4" /> Assign Job
            </PremiumButton>
          }
        />
      ) : (
        <div className="divide-y divide-[#E7E5E4]/70">
          {jobs.map((j) => (
            <div
              key={j.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-3.5 hover:bg-[#faf8f5] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#1C1917] text-sm truncate">
                  {j.taskDescription}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500 mt-0.5">
                  {j.freelancer && <span>{j.freelancer.fullName}</span>}
                  {j.dueDate && <span>Due {formatDate(j.dueDate)}</span>}
                  {j.cost != null && (
                    <span className="tabular-nums">GHS {j.cost}</span>
                  )}
                </div>
              </div>
              <Select
                value={j.status}
                onValueChange={(v) =>
                  statusMutation.mutate({ id: j.id, status: v })
                }
              >
                <SelectTrigger
                  size="sm"
                  className="w-[140px] bg-white border-[#E7E5E4] rounded-md h-9 shrink-0"
                  disabled={statusMutation.isPending}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}

      <AssignJobDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        freelancers={freelancers}
        onDone={() => qc.invalidateQueries({ queryKey: ["freelance-jobs"] })}
      />
    </SectionCard>
  );
}

function AssignJobDialog({
  open,
  onOpenChange,
  freelancers,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  freelancers: Freelancer[];
  onDone: () => void;
}) {
  const [freelancerId, setFreelancerId] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [cost, setCost] = useState("");
  const [dueDate, setDueDate] = useState("");

  const reset = () => {
    setFreelancerId("");
    setTaskDescription("");
    setCost("");
    setDueDate("");
  };

  const createMutation = useMutation({
    mutationFn: () =>
      apiPost<FreelanceJob>("/api/freelance-jobs", {
        freelancerId,
        taskDescription: taskDescription.trim(),
        cost: cost ? Number(cost) : undefined,
        dueDate: dueDate || undefined,
      }),
    onSuccess: () => {
      toast.success("Job assigned.");
      onDone();
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) =>
      toast.error("Could not assign job.", { description: err.message }),
  });

  const valid = freelancerId && taskDescription.trim().length > 0;

  function handleOpenChange(v: boolean) {
    if (!v && !createMutation.isPending) reset();
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign a job</DialogTitle>
          <DialogDescription>
            This is exactly what the freelancer will see when they log in —
            nothing about your shop, customers, or staff.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) createMutation.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Freelancer" required>
            <Select value={freelancerId} onValueChange={setFreelancerId}>
              <SelectTrigger className="h-10 bg-white border-[#E7E5E4] rounded-md w-full">
                <SelectValue placeholder="Choose a freelancer" />
              </SelectTrigger>
              <SelectContent>
                {freelancers.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Task / garment" required>
            <Textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="e.g. Bead the bodice for order SW-1042 — floral pattern"
              className="bg-white border-[#E7E5E4] rounded-md min-h-[70px] resize-y"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cost (GHS)">
              <Input
                type="number"
                min="0"
                step="1"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="e.g. 150"
                className="h-10 bg-white border-[#E7E5E4] rounded-md tabular-nums"
              />
            </Field>
            <Field label="Due date">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 bg-white border-[#E7E5E4] rounded-md"
              />
            </Field>
          </div>

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
              Assign job
            </PremiumButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
        fullName: body.name,
        specialty: body.specialty,
        skills: body.skills || null,
        phone: body.phone || null,
        email: body.email,
        rateNotes: body.rateNotes || null,
        status: body.status,
        password: body.password || undefined,
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

  const valid = form.name.trim().length > 0 && form.email.trim().length > 0;

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
            specialist for bespoke work. They get their own separate login —
            they&apos;ll only ever see the jobs you assign them, never your
            customers, staff, or orders. If this email already has a
            freelancer account (from another shop), you&apos;ll just be
            linking to it, not creating a duplicate.
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
            <Field label="Email" required>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="name@example.com — used for their login"
                className="h-10 bg-white border-[#E7E5E4] rounded-md"
                required
              />
            </Field>
          </div>

          <Field label="Password (optional)">
            <Input
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Leave blank to use the default starter password"
              className="h-10 bg-white border-[#E7E5E4] rounded-md"
              autoComplete="new-password"
            />
            <p className="text-xs text-stone-400 mt-1">
              Only used if this is a brand-new freelancer. If they already
              have an account with another shop, their existing password
              stays as-is.
            </p>
          </Field>

          <div className="grid sm:grid-cols-2 gap-3">
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

          <Field label="Rate & notes">
            <Textarea
              value={form.rateNotes}
              onChange={(e) => set("rateNotes", e.target.value)}
              placeholder="What you pay them, lead time, preferred fabrics, payment terms…"
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

/* ====================== Edit Trainee Profile Dialog ====================== */

interface EditTraineeForm {
  mentorId: string;
  programId: string;
  trainingDurationWeeks: string;
  trainingStartedAt: string;
  canAccessOrders: boolean;
  canAccessBoard: boolean;
  canManageFreelancers: boolean;
}

function EditTraineeDialog({
  open,
  onOpenChange,
  trainee,
  mentors,
  isOwnerViewer,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trainee: User | null;
  mentors: User[];
  isOwnerViewer: boolean;
}) {
  const qc = useQueryClient();
  const programsQ = useQuery<TrainingProgram[]>({
    queryKey: ["training-programs"],
    queryFn: () => apiGet<TrainingProgram[]>("/api/training-programs"),
  });
  // Initialise from the trainee prop on mount. The parent passes a `key`
  // based on `editTrainee?.id` so the dialog remounts (and this runs again)
  // whenever a different trainee is opened.
  const [form, setForm] = useState<EditTraineeForm>(() => ({
    mentorId: trainee?.mentorId ?? UNASSIGNED_MENTOR,
    programId: trainee?.programId ?? NO_PROGRAM,
    trainingDurationWeeks:
      trainee?.trainingDurationWeeks != null
        ? String(trainee.trainingDurationWeeks)
        : "12",
    trainingStartedAt: toDateInput(trainee?.trainingStartedAt),
    canAccessOrders: (trainee as any)?.canAccessOrders ?? false,
    canAccessBoard: (trainee as any)?.canAccessBoard ?? false,
    canManageFreelancers: (trainee as any)?.canManageFreelancers ?? false,
  }));

  const saveMutation = useMutation({
    mutationFn: (body: {
      mentorId: string | null;
      programId: string | null;
      trainingDurationWeeks: number | null;
      trainingStartedAt: string | null;
      canAccessOrders: boolean;
      canAccessBoard: boolean;
      canManageFreelancers?: boolean;
    }) => apiPatch<User>(`/api/users/${trainee?.id}`, body),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(`${u.fullName}'s profile updated.`, {
        description: "Mentor + training schedule saved.",
      });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Could not update profile.", { description: err.message });
    },
  });

  const set = <K extends keyof EditTraineeForm>(k: K, v: EditTraineeForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trainee) return;
    const durationRaw = form.trainingDurationWeeks.trim();
    const durationNum = durationRaw ? Number(durationRaw) : NaN;
    saveMutation.mutate({
      mentorId:
        form.mentorId && form.mentorId !== UNASSIGNED_MENTOR
          ? form.mentorId
          : null,
      programId:
        form.programId && form.programId !== NO_PROGRAM
          ? form.programId
          : null,
      trainingDurationWeeks:
        !isNaN(durationNum) && durationNum > 0 ? durationNum : null,
      trainingStartedAt: form.trainingStartedAt || null,
      canAccessOrders: form.canAccessOrders,
      canAccessBoard: form.canAccessBoard,
      ...(isOwnerViewer && {
        canManageFreelancers: form.canManageFreelancers,
      }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit trainee profile</DialogTitle>
          <DialogDescription>
            Assign a mentor and set the apprenticeship schedule
            {trainee ? ` for ${trainee.fullName}` : ""}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Mentor">
            <Select
              value={form.mentorId || UNASSIGNED_MENTOR}
              onValueChange={(v) => set("mentorId", v)}
            >
              <SelectTrigger className="h-10 bg-white border-[#E7E5E4] rounded-md w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED_MENTOR}>Unassigned</SelectItem>
                {mentors.length === 0 ? (
                  <SelectItem value="__no_mentors" disabled>
                    No trainers or madam available
                  </SelectItem>
                ) : (
                  mentors.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.fullName} · {roleLabel(m.role)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>
          <p className="text-[11px] text-stone-400 -mt-2">
            Mentors must be a trainer or the Madam.
          </p>

          <Field label="Training program (curriculum)">
            <Select
              value={form.programId || NO_PROGRAM}
              onValueChange={(v) => set("programId", v)}
            >
              <SelectTrigger className="h-10 bg-white border-[#E7E5E4] rounded-md w-full">
                <SelectValue placeholder="Not enrolled" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROGRAM}>Not enrolled</SelectItem>
                {(programsQ.data ?? []).length === 0 ? (
                  <SelectItem value="__no_programs" disabled>
                    No training programs yet — create one under Curriculum
                  </SelectItem>
                ) : (
                  (programsQ.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {p.level}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>
          <p className="text-[11px] text-stone-400 -mt-2">
            Enrolling in a program lets this trainee see its curriculum in
            their Progress view and shows on their downloadable portfolio.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Training duration (weeks)">
              <Input
                type="number"
                min="1"
                step="1"
                value={form.trainingDurationWeeks}
                onChange={(e) => set("trainingDurationWeeks", e.target.value)}
                placeholder="12"
                className="h-10 bg-white border-[#E7E5E4] rounded-md tabular-nums"
              />
            </Field>
            <Field label="Training started date">
              <Input
                type="date"
                value={form.trainingStartedAt}
                onChange={(e) => set("trainingStartedAt", e.target.value)}
                className="h-10 bg-white border-[#E7E5E4] rounded-md tabular-nums"
              />
            </Field>
          </div>

          <div className="rounded-md bg-[#FBF9F7] border border-[#E7E5E4] px-3 py-2.5 flex items-start gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-[#800020] shrink-0 mt-0.5" />
            <p className="text-[11px] text-stone-500 leading-relaxed">
              The training duration + start date drive the progress bar on the
              trainee&rsquo;s card and the &ldquo;Week X of Y&rdquo; schedule
              in the Progress view.
            </p>
          </div>

          {/* Trainee access permissions */}
          <div className="rounded-md border border-[#E7E5E4] divide-y divide-[#E7E5E4]">
            <div className="px-3 py-2 bg-[#faf8f5] flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#800020]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                Studio access permissions
              </p>
            </div>
            <label className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#1C1917] flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-stone-400" />
                  Orders access
                </p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Let this trainee view the Orders list and order details.
                </p>
              </div>
              <Switch
                checked={form.canAccessOrders}
                onCheckedChange={(v) => set("canAccessOrders", v)}
              />
            </label>
            <label className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#1C1917] flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-stone-400" />
                  Production Board access
                </p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Let this trainee view the Production Board kanban.
                </p>
              </div>
              <Switch
                checked={form.canAccessBoard}
                onCheckedChange={(v) => set("canAccessBoard", v)}
              />
            </label>
            {isOwnerViewer && (
              <label className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1C1917] flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-stone-400" />
                    Freelancer management
                  </p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Let this trainee commission freelancers and assign jobs.
                  </p>
                </div>
                <Switch
                  checked={form.canManageFreelancers}
                  onCheckedChange={(v) => set("canManageFreelancers", v)}
                />
              </label>
            )}
          </div>
          <p className="text-[11px] text-stone-400 -mt-2 flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Trainees only see Orders and the Board when you grant access here.
          </p>

          <DialogFooter>
            <PremiumButton
              type="button"
              variant="outline"
              size="md"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </PremiumButton>
            <PremiumButton
              type="submit"
              variant="primary"
              size="md"
              loading={saveMutation.isPending}
            >
              <Pencil className="w-4 h-4" /> Save profile
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
