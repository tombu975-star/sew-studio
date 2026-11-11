"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Award,
  Printer,
  Scissors,
  GraduationCap,
  Check,
  Trash2,
  Mail,
  Phone,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import { PageHeader } from "@/components/atelier/PageHeader";
import { LearningTabs } from "@/components/atelier/LearningTabs";
import { SectionCard } from "@/components/atelier/SectionCard";
import { EmptyState, SkeletonCard } from "@/components/atelier/EmptyState";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { StatusBadge } from "@/components/atelier/StatusBadge";

import {
  Dialog,
  DialogContent,
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Certificate, TrainingLog, User } from "@/lib/types";
import { useAuth } from "@/stores/auth";
import { useNav } from "@/stores/nav";
import { useRole } from "@/stores/role";
import { cn } from "@/lib/utils";

/* ----------------------------- helpers ----------------------------- */

const PRINT_STYLES = `
@media print {
  body * { visibility: hidden !important; }
  .print-area, .print-area * { visibility: visible !important; }
  .print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
  .no-print { display: none !important; }
  .print-area .cert-card { box-shadow: none !important; border-width: 3px !important; }
  @page { size: landscape; margin: 12mm; }
}
`;

const HONOR_OPTIONS = ["Distinction", "Merit", "Pass", "None"] as const;

function initialOf(name: string): string {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

function gradientFor(name: string): string {
  // Deterministic burgundy-leaning gradient avatar.
  const palettes = [
    "from-[#800020] to-[#650019]",
    "from-[#800020] to-[#b45309]",
    "from-[#650019] to-[#0e7490]",
    "from-[#800020] to-[#4A6B53]",
    "from-[#650019] to-[#800020]",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}

function deriveProficientSkills(logs: TrainingLog[]): string {
  // Group by skill, include only skills whose LATEST status is Proficient.
  const latestBySkill = new Map<string, TrainingLog>();
  for (const log of logs) {
    const skill = log.skill?.trim();
    if (!skill) continue;
    const prev = latestBySkill.get(skill);
    if (!prev || new Date(log.date).getTime() > new Date(prev.date).getTime()) {
      latestBySkill.set(skill, log);
    }
  }
  const proficient = Array.from(latestBySkill.entries())
    .filter(([, log]) => log.status === "Proficient")
    .map(([skill]) => skill)
    .sort((a, b) => a.localeCompare(b));
  return proficient.join(", ");
}

/* =============================== Certificate =============================== */

export default function Certificate() {
  const { user } = useAuth();
  const { isTrainee, isOwner, isTrainer } = useRole();

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
      {user && isTrainee() ? (
        <TraineeCertificate traineeId={user.id} />
      ) : user && (isOwner() || isTrainer()) ? (
        <OwnerCertificate />
      ) : (
        <>
          <PageHeader
            eyebrow="Apprenticeship"
            eyebrowIcon={Award}
            title="Certificate"
            subtitle="Apprenticeship completion certificates for atelier trainees."
          />
          <SectionCard>
            <EmptyState
              icon={ShieldCheck}
              title="Not available"
              description="You don't have access to view certificates."
            />
          </SectionCard>
        </>
      )}
    </div>
  );
}

/* =========================== Trainee mode ============================ */

function TraineeCertificate({ traineeId }: { traineeId: string }) {
  const certsQ = useQuery<Certificate[]>({
    queryKey: ["certificates", traineeId],
    queryFn: () =>
      apiGet<Certificate[]>(`/api/certificates?traineeId=${traineeId}`),
  });

  const cert = certsQ.data?.[0] ?? null;

  return (
    <>
      <PageHeader
        eyebrow="My apprenticeship"
        eyebrowIcon={Award}
        title="My Certificate"
        subtitle="Your official certificate of apprenticeship completion."
      />
      <LearningTabs current="certificate" />

      {certsQ.isLoading ? (
        <div className="grid gap-4">
          <SkeletonCard className="h-[640px]" />
        </div>
      ) : cert ? (
        <CertificateStage
          cert={cert}
          showRevoke={false}
          onRevoke={undefined}
          revoking={false}
        />
      ) : (
        <SectionCard>
          <EmptyState
            icon={Award}
            title="Your certificate will appear here"
            description="Once your training is complete and your mentor issues it, your official certificate of apprenticeship will be displayed here for printing."
          />
        </SectionCard>
      )}
    </>
  );
}

/* ========================= Owner / Trainer mode ====================== */

function OwnerCertificate() {
  const { user } = useAuth();
  const { selectedId, go } = useNav();
  const qc = useQueryClient();

  const usersQ = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiGet<User[]>("/api/users"),
  });

  const trainees = useMemo(
    () =>
      (usersQ.data ?? [])
        .filter((u) => u.role === "trainee")
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [usersQ.data]
  );

  const selectedTrainee = useMemo(
    () => trainees.find((t) => t.id === selectedId) ?? null,
    [trainees, selectedId]
  );
  const activeTraineeId = selectedTrainee ? selectedTrainee.id : null;

  // Revoke mutation
  const revokeMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/certificates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certificates"] });
      toast.success("Certificate revoked.", {
        description: "The trainee can be issued a new certificate later.",
      });
    },
    onError: (e: Error) => {
      toast.error("Could not revoke certificate.", {
        description: e.message,
      });
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Apprenticeship"
        eyebrowIcon={Award}
        title="Certificates"
        subtitle="Issue and print official apprenticeship completion certificates."
        actions={
          user ? (
            <div className="hidden md:flex items-center gap-2 rounded-full border border-[#EEDFE3] bg-white pl-2 pr-3 py-1.5 elevate-sm">
              <span
                className={cn(
                  "w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[11px] font-display font-semibold",
                  gradientFor(user.fullName)
                )}
              >
                {initialOf(user.fullName)}
              </span>
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                  {user.role === "trainer" ? "Trainer" : "Owner"}
                </div>
                <div className="text-xs font-medium text-[#2F151B]">
                  {user.fullName}
                </div>
              </div>
            </div>
          ) : undefined
        }
      />
      <LearningTabs current="certificate" />

      {/* Trainee picker */}
      <SectionCard
        title="Select a trainee"
        bodyClassName="p-4 sm:p-5"
        className="mb-6 no-print"
      >
        {usersQ.isLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 h-14 w-44 rounded-lg shimmer"
                aria-hidden
              />
            ))}
          </div>
        ) : trainees.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No trainees yet"
            description="Add trainees from the Team view to issue them certificates."
            action={
              <PremiumButton
                size="sm"
                variant="outline"
                onClick={() => go("team")}
              >
                Go to Team <ArrowRight className="w-3.5 h-3.5" />
              </PremiumButton>
            }
          />
        ) : (
          <>
            {/* Mobile: Select dropdown */}
            <div className="md:hidden">
              <Select
                value={activeTraineeId ?? undefined}
                onValueChange={(v) => go("certificate", { id: v })}
              >
                <SelectTrigger className="w-full h-11 bg-white">
                  <SelectValue placeholder="Choose a trainee…" />
                </SelectTrigger>
                <SelectContent>
                  {trainees.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-5 h-5 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[9px] font-display font-semibold",
                            gradientFor(t.fullName)
                          )}
                        >
                          {initialOf(t.fullName)}
                        </span>
                        {t.fullName}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Desktop: chips row */}
            <div className="hidden md:flex gap-3 overflow-x-auto pb-1">
              {trainees.map((t) => {
                const active = t.id === activeTraineeId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => go("certificate", { id: t.id })}
                    aria-pressed={active}
                    className={cn(
                      "group shrink-0 flex items-center gap-3 rounded-xl border px-3 py-2 transition-all duration-200",
                      active
                        ? "bg-[#800020] border-[#650019] text-white"
                        : "bg-white border-[#EEDFE3] text-[#2F151B] hover:border-[#800020]/30 hover:bg-[#FCF8F9] elevate-sm lift"
                    )}
                  >
                    <span
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center font-display font-semibold text-sm shrink-0",
                        active
                          ? "bg-white/15 text-white"
                          : "bg-gradient-to-br text-white " +
                            gradientFor(t.fullName)
                      )}
                    >
                      {initialOf(t.fullName)}
                    </span>
                    <span className="text-left">
                      <span className="block text-sm font-medium leading-tight">
                        {t.fullName}
                      </span>
                      <span
                        className={cn(
                          "block text-[10px] uppercase tracking-[0.16em]",
                          active ? "text-white/70" : "text-stone-400"
                        )}
                      >
                        Trainee
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </SectionCard>

      {activeTraineeId && selectedTrainee ? (
        <SelectedTraineeHeader
          trainee={selectedTrainee}
          onClear={() => go("certificate", { id: null })}
        />
      ) : null}

      {activeTraineeId && selectedTrainee ? (
        <CertificateForTrainee
          key={selectedTrainee.id}
          trainee={selectedTrainee}
          issuerId={user?.id ?? ""}
          onRevoke={(id) => revokeMut.mutate(id)}
          revoking={revokeMut.isPending}
        />
      ) : (
        !usersQ.isLoading &&
        trainees.length > 0 && (
          <SectionCard className="no-print">
            <EmptyState
              icon={Award}
              title="Pick a trainee to begin"
              description="Choose an apprentice above to view, issue, or revoke their apprenticeship certificate."
            />
          </SectionCard>
        )
      )}
    </>
  );
}

function SelectedTraineeHeader({
  trainee,
  onClear,
}: {
  trainee: User;
  onClear: () => void;
}) {
  return (
    <div className="surface-premium border border-[#EEDFE3] rounded-lg elevate-sm lift p-5 mb-6 flex items-center gap-4 animate-fade-in-up no-print">
      <div
        className={cn(
          "w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-display font-semibold text-xl shrink-0 shadow-sm",
          gradientFor(trainee.fullName)
        )}
        aria-hidden
      >
        {initialOf(trainee.fullName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-display font-semibold text-[#2F151B] text-xl leading-tight">
            {trainee.fullName}
          </h2>
          <StatusBadge status="Trainee" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
          {trainee.email && (
            <span className="inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {trainee.email}
            </span>
          )}
          {trainee.phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> {trainee.phone}
            </span>
          )}
        </div>
      </div>
      <PremiumButton
        size="sm"
        variant="ghost"
        onClick={onClear}
        className="hidden sm:inline-flex"
      >
        Change trainee
      </PremiumButton>
    </div>
  );
}

/**
 * For the selected trainee — fetch their certificate + training logs.
 * If they have a cert → show printable card + revoke button.
 * If not → show issue panel + dialog.
 */
function CertificateForTrainee({
  trainee,
  issuerId,
  onRevoke,
  revoking,
}: {
  trainee: User;
  issuerId: string;
  onRevoke: (id: string) => void;
  revoking: boolean;
}) {
  const qc = useQueryClient();
  const [issueOpen, setIssueOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);

  const certsQ = useQuery<Certificate[]>({
    queryKey: ["certificates", trainee.id],
    queryFn: () =>
      apiGet<Certificate[]>(`/api/certificates?traineeId=${trainee.id}`),
  });

  const logsQ = useQuery<TrainingLog[]>({
    queryKey: ["training-logs", trainee.id],
    queryFn: () =>
      apiGet<TrainingLog[]>(`/api/training-logs?traineeId=${trainee.id}`),
  });

  const cert = certsQ.data?.[0] ?? null;
  const logs = logsQ.data ?? [];

  const stats = useMemo(() => {
    const total = logs.length;
    const proficient = logs.filter((l) => l.status === "Proficient").length;
    return { total, proficient };
  }, [logs]);

  const issueMut = useMutation({
    mutationFn: (payload: {
      traineeId: string;
      issuedById: string;
      programName: string;
      durationWeeks: number;
      skillsAchieved: string;
      honors: string;
    }) => apiPost<Certificate>("/api/certificates", payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["certificates"] });
      toast.success("Certificate issued.", {
        description: `${data.trainee?.fullName ?? "Trainee"}'s certificate is ready to print.`,
      });
      setIssueOpen(false);
    },
    onError: (e: Error) => {
      toast.error("Could not issue certificate.", {
        description: e.message,
      });
    },
  });

  if (certsQ.isLoading || logsQ.isLoading) {
    return (
      <div className="grid gap-4">
        <SkeletonCard className="h-[640px]" />
      </div>
    );
  }

  if (cert) {
    return (
      <>
        <CertificateStage
          cert={cert}
          showRevoke
          onRevoke={() => setRevokeOpen(true)}
          revoking={revoking}
        />

        <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke this certificate?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove{" "}
                <span className="font-medium text-[#2F151B]">
                  {cert.trainee?.fullName}
                </span>
                &apos;s certificate ({cert.certificateNo}). This action cannot
                be undone. You can issue a new certificate afterwards.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onRevoke(cert.id)}
                className="bg-[#8E3232] text-white hover:bg-[#6B2626] border-[#8E3232]"
              >
                {revoking ? "Revoking…" : "Revoke certificate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // No certificate yet — show issue panel.
  return (
    <IssuePanel
      trainee={trainee}
      issuerId={issuerId}
      totalLogs={stats.total}
      proficientCount={stats.proficient}
      prefilledSkills={deriveProficientSkills(logs)}
      issueOpen={issueOpen}
      setIssueOpen={setIssueOpen}
      issuing={issueMut.isPending}
      onIssue={(payload) => issueMut.mutate(payload)}
    />
  );
}

function IssuePanel({
  trainee,
  issuerId,
  totalLogs,
  proficientCount,
  prefilledSkills,
  issueOpen,
  setIssueOpen,
  issuing,
  onIssue,
}: {
  trainee: User;
  issuerId: string;
  totalLogs: number;
  proficientCount: number;
  prefilledSkills: string;
  issueOpen: boolean;
  setIssueOpen: (v: boolean) => void;
  issuing: boolean;
  onIssue: (payload: {
    traineeId: string;
    issuedById: string;
    programName: string;
    durationWeeks: number;
    skillsAchieved: string;
    honors: string;
  }) => void;
}) {
  return (
    <SectionCard
      title="Apprenticeship status"
      bodyClassName="p-5 sm:p-6"
      accent
      className="no-print animate-fade-in-up"
      action={
        <PremiumButton
          size="sm"
          onClick={() => setIssueOpen(true)}
          disabled={!issuerId}
        >
          <Award className="w-4 h-4" /> Issue certificate
        </PremiumButton>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
        {/* Trainee identity */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-display font-semibold text-xl shrink-0",
              gradientFor(trainee.fullName)
            )}
            aria-hidden
          >
            {initialOf(trainee.fullName)}
          </div>
          <div>
            <div className="font-display font-semibold text-[#2F151B] text-lg leading-tight">
              {trainee.fullName}
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400 mt-1">
              No certificate issued
            </div>
          </div>
        </div>

        {/* Training summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <SummaryStat label="Training logs" value={totalLogs} />
          <SummaryStat
            label="Proficient skills"
            value={proficientCount}
            accent
          />
          <SummaryStat
            label="Ready to issue"
            value={proficientCount > 0 ? "Yes" : "Soon"}
          />
        </div>
      </div>

      <Separator className="my-5" />

      <div className="rounded-lg border border-[#EEDFE3] bg-[#FCF8F9] p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="w-9 h-9 rounded-full bg-[#800020]/8 border border-[#800020]/15 flex items-center justify-center shrink-0">
          <GraduationCap className="w-4 h-4 text-[#800020]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#2F151B]">
            Ready to issue {trainee.fullName.split(" ")[0]}&apos;s certificate?
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            {prefilledSkills
              ? "Proficient skills will be pre-filled — review and edit before issuing."
              : "No proficient skills recorded yet — you can still issue a certificate and add skills manually."}
          </p>
        </div>
        <PremiumButton
          onClick={() => setIssueOpen(true)}
          disabled={!issuerId}
          className="shrink-0"
        >
          <Award className="w-4 h-4" /> Issue certificate
        </PremiumButton>
      </div>

      <IssueDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        trainee={trainee}
        issuerId={issuerId}
        prefilledSkills={prefilledSkills}
        issuing={issuing}
        onIssue={onIssue}
      />
    </SectionCard>
  );
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[#EEDFE3] bg-white p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-display font-semibold tabular-nums",
          accent ? "text-[#800020]" : "text-[#2F151B]",
          "text-2xl"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function IssueDialog({
  open,
  onOpenChange,
  trainee,
  issuerId,
  prefilledSkills,
  issuing,
  onIssue,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trainee: User;
  issuerId: string;
  prefilledSkills: string;
  issuing: boolean;
  onIssue: (payload: {
    traineeId: string;
    issuedById: string;
    programName: string;
    durationWeeks: number;
    skillsAchieved: string;
    honors: string;
  }) => void;
}) {
  const [programName, setProgramName] = useState("Atelier Apprenticeship Programme");
  const [durationWeeks, setDurationWeeks] = useState(12);
  const [skillsAchieved, setSkillsAchieved] = useState(prefilledSkills);
  const [honors, setHonors] = useState<string>("Distinction");

  // The parent (CertificateForTrainee) is keyed by trainee.id, so this dialog
  // remounts fresh whenever the selected trainee changes — keeping
  // skillsAchieved in sync with the new trainee's Proficient skills without
  // needing a useEffect.

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuerId) {
      toast.error("Cannot issue certificate — your user ID is missing.");
      return;
    }
    if (!programName.trim()) {
      toast.error("Programme name is required.");
      return;
    }
    onIssue({
      traineeId: trainee.id,
      issuedById: issuerId,
      programName: programName.trim(),
      durationWeeks: Number(durationWeeks) || 12,
      skillsAchieved: skillsAchieved.trim(),
      honors: honors === "None" ? "" : honors,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg no-print">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-[#2F151B] flex items-center gap-2">
            <Award className="w-5 h-5 text-[#800020]" />
            Issue certificate
          </DialogTitle>
          <p className="text-xs text-stone-500 -mt-1">
            For{" "}
            <span className="font-medium text-[#2F151B]">
              {trainee.fullName}
            </span>{" "}
            · issued by you ({issuerId ? "you" : "—"}).
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cert-program" className="text-xs">
              Programme name
            </Label>
            <Input
              id="cert-program"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="Atelier Apprenticeship Programme"
              required
              className="h-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cert-weeks" className="text-xs">
                Duration (weeks)
              </Label>
              <Input
                id="cert-weeks"
                type="number"
                min={1}
                max={104}
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Number(e.target.value))}
                className="h-10 tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cert-honors" className="text-xs">
                Honors
              </Label>
              <Select value={honors} onValueChange={setHonors}>
                <SelectTrigger id="cert-honors" className="w-full h-10 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HONOR_OPTIONS.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cert-skills" className="text-xs">
              Mastered skills{" "}
              <span className="text-stone-400">
                (comma-separated, prefilled from Proficient log entries)
              </span>
            </Label>
            <Textarea
              id="cert-skills"
              value={skillsAchieved}
              onChange={(e) => setSkillsAchieved(e.target.value)}
              placeholder="e.g. Measurements, Kente cutting, Pattern drafting"
              rows={3}
              className="resize-none"
            />
            {prefilledSkills && (
              <button
                type="button"
                onClick={() => setSkillsAchieved(prefilledSkills)}
                className="text-[11px] text-[#800020] hover:underline"
              >
                Reset to proficient skills
              </button>
            )}
          </div>

          <DialogFooter className="pt-2">
            <PremiumButton
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={issuing}
            >
              Cancel
            </PremiumButton>
            <PremiumButton type="submit" loading={issuing}>
              <Award className="w-4 h-4" />
              {issuing ? "Issuing…" : "Issue certificate"}
            </PremiumButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ===================== Shared certificate stage ===================== */

function CertificateStage({
  cert,
  showRevoke,
  onRevoke,
  revoking,
}: {
  cert: Certificate;
  showRevoke: boolean;
  onRevoke?: () => void;
  revoking: boolean;
}) {
  return (
    <div className="animate-fade-in-up">
      <div className="print-area">
        <CertificateCard cert={cert} />
      </div>

      {/* Action bar — hidden in print */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 no-print">
        <PremiumButton variant="outline" onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> Print certificate
        </PremiumButton>
        {showRevoke && (
          <PremiumButton
            variant="ghost"
            onClick={onRevoke}
            loading={revoking}
            className="text-[#8E3232] hover:bg-[#8E3232]/5 hover:text-[#6B2626]"
          >
            <Trash2 className="w-4 h-4" /> Revoke
          </PremiumButton>
        )}
      </div>
    </div>
  );
}

/* ============================ The card ============================ */

function CertificateCard({ cert }: { cert: Certificate }) {
  const skills = useMemo(
    () =>
      cert.skillsAchieved
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [cert.skillsAchieved]
  );

  const year = new Date(cert.issuedAt).getFullYear();
  const honorsText = cert.honors && cert.honors !== "None"
    ? `Awarded with ${cert.honors}.`
    : "";

  return (
    <div
      className="cert-card bg-white border-4 border-[#800020] rounded-lg elevate-lg relative overflow-hidden mx-auto"
      style={{
        maxWidth: "920px",
        minHeight: "640px",
        padding: "clamp(28px, 4vw, 56px)",
      }}
    >
      {/* Inner border ornament */}
      <div
        className="absolute inset-3 border border-[#800020]/25 rounded-md pointer-events-none"
        aria-hidden
      />
      {/* Subtle background flourish */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 18%, #800020 0%, transparent 45%)",
        }}
        aria-hidden
      />

      {/* Corner ornaments */}
      {[
        "top-3 left-3",
        "top-3 right-3",
        "bottom-3 left-3",
        "bottom-3 right-3",
      ].map((pos) => (
        <Scissors
          key={pos}
          className={cn(
            "absolute w-4 h-4 text-[#800020]/30 pointer-events-none",
            pos
          )}
          aria-hidden
        />
      ))}

      {/* Content layer */}
      <div className="relative z-10 flex flex-col items-center text-center h-full">
        {/* Studio mark */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#800020] flex items-center justify-center bg-white">
            <Scissors className="w-5 h-5 text-[#800020]" />
          </div>
          <div
            className="font-display font-semibold text-[#2F151B] mt-2.5"
            style={{ fontSize: "clamp(20px, 2.4vw, 26px)" }}
          >
            Madam Studio
          </div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-stone-500 mt-1">
            Bespoke Atelier · Accra
          </div>
        </div>

        {/* Title block */}
        <div className="mt-8 sm:mt-10">
          <h1
            className="font-display font-semibold text-[#800020] leading-[1.05]"
            style={{ fontSize: "clamp(30px, 4.2vw, 48px)" }}
          >
            Certificate of Apprenticeship
          </h1>
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.22em] text-stone-500 mt-3">
            This is to certify that
          </p>
        </div>

        {/* Trainee name */}
        <div className="mt-5 sm:mt-6">
          <div
            className="font-display font-semibold text-[#2F151B] leading-tight"
            style={{ fontSize: "clamp(24px, 3.2vw, 38px)" }}
          >
            {cert.trainee?.fullName ?? "Trainee"}
          </div>
          <div className="w-48 h-px bg-[#800020]/40 mx-auto mt-2" />
        </div>

        {/* Body */}
        <p
          className="mt-6 text-stone-600 max-w-[640px] mx-auto"
          style={{ fontSize: "clamp(13px, 1.1vw, 15px)", lineHeight: 1.7 }}
        >
          has successfully completed the{" "}
          <span className="italic text-[#800020] font-medium">
            {cert.programName}
          </span>
          , a{" "}
          <span className="tabular-nums font-medium text-[#2F151B]">
            {cert.durationWeeks}
          </span>
          -week apprenticeship programme in bespoke tailoring and design.
          {honorsText && (
            <span className="block mt-2 font-medium text-[#800020]">
              {honorsText}
            </span>
          )}
        </p>

        {/* Skills chips */}
        {skills.length > 0 && (
          <div className="mt-6 sm:mt-7 w-full max-w-[640px]">
            <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 mb-2.5">
              Mastered skills
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-md border border-[#800020]/20 bg-[#800020]/5 text-[#800020] px-2.5 py-1 text-xs"
                >
                  <Check className="w-3 h-3 opacity-70" />
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bottom row */}
        <div className="mt-auto w-full pt-10 sm:pt-12">
          <div className="grid grid-cols-3 items-end gap-4 sm:gap-6">
            {/* Issued by */}
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 mb-2">
                Issued by
              </div>
              <div className="h-px bg-[#2F151B]/40 w-full max-w-[180px] mb-1.5" />
              <div
                className="font-display font-semibold text-[#2F151B] leading-tight"
                style={{ fontSize: "clamp(13px, 1.1vw, 16px)" }}
              >
                {cert.issuedBy?.fullName ?? "—"}
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mt-0.5">
                Mentor
              </div>
            </div>

            {/* Faux seal */}
            <div className="flex flex-col items-center">
              <div
                className="w-20 h-20 rounded-full border-2 border-[#800020] flex items-center justify-center bg-white relative"
                style={{ transform: "rotate(-6deg)" }}
                aria-hidden
              >
                <div className="absolute inset-1 rounded-full border border-[#800020]/30" />
                <div className="flex flex-col items-center">
                  <span
                    className="font-display font-semibold text-[#800020] leading-none"
                    style={{ fontSize: "clamp(16px, 1.8vw, 20px)" }}
                  >
                    MS
                  </span>
                  <span className="text-[8px] uppercase tracking-[0.16em] text-[#800020] mt-0.5">
                    {year}
                  </span>
                </div>
              </div>
            </div>

            {/* Certificate number */}
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 mb-2">
                Certificate No.
              </div>
              <div className="h-px bg-[#2F151B]/40 w-full max-w-[180px] ml-auto mb-1.5" />
              <div className="font-mono text-[#2F151B] text-xs sm:text-sm tabular-nums break-all">
                {cert.certificateNo}
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mt-0.5">
                {formatDate(cert.issuedAt)} · Date issued
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
