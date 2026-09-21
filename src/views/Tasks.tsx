"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  AlertCircle,
  CalendarDays,
  Link2,
  ListTodo,
  Loader2,
  CheckCheck,
  KanbanSquare,
} from "lucide-react";
import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumMetric } from "@/components/atelier/PremiumMetric";
import { AnimatedNumber } from "@/components/atelier/AnimatedNumber";
import {
  EmptyState,
  SkeletonCard,
} from "@/components/atelier/EmptyState";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { isOverdue, PRIORITY_LEVELS, shortDate, todayISO } from "@/lib/format";
import type { Order, Task, User } from "@/lib/types";
import { useNav } from "@/stores/nav";
import { cn } from "@/lib/utils";

interface TaskWithRelations extends Task {
  order?: (Order & { customer: Order["customer"] }) | null;
  staff?: User | null;
}

const COLUMNS = ["To Do", "In Progress", "Done"] as const;
type ColumnStatus = (typeof COLUMNS)[number];

const PRIORITY_FILTER_OPTIONS = ["All Priority", ...PRIORITY_LEVELS] as const;

const COLUMN_ICON: Record<ColumnStatus, React.ComponentType<{ className?: string }>> = {
  "To Do": ListTodo,
  "In Progress": Loader2,
  Done: CheckCheck,
};

export default function Tasks() {
  const go = useNav((s) => s.go);
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [staffFilter, setStaffFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All Priority");

  const { data: tasks = [], isLoading, isError } = useQuery<TaskWithRelations[]>({
    queryKey: ["tasks"],
    queryFn: () => apiGet<TaskWithRelations[]>("/api/tasks"),
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => apiGet<Order[]>("/api/orders"),
  });

  const staffOptions = useMemo(() => {
    const map = new Map<string, User>();
    for (const t of tasks) {
      if (t.staff) map.set(t.staff.id, t.staff);
    }
    return Array.from(map.values());
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (staffFilter !== "All") {
        if (staffFilter === "Unassigned" && t.staff) return false;
        if (staffFilter !== "Unassigned" && t.staff?.id !== staffFilter)
          return false;
      }
      if (priorityFilter !== "All Priority" && t.priority !== priorityFilter)
        return false;
      return true;
    });
  }, [tasks, staffFilter, priorityFilter]);

  const grouped = useMemo(() => {
    const map: Record<ColumnStatus, TaskWithRelations[]> = {
      "To Do": [],
      "In Progress": [],
      Done: [],
    };
    for (const t of filtered) {
      const status = (COLUMNS as readonly string[]).includes(t.status)
        ? (t.status as ColumnStatus)
        : "To Do";
      map[status].push(t);
    }
    return map;
  }, [filtered]);

  const stats = useMemo(
    () => ({
      todo: grouped["To Do"].length,
      inProgress: grouped["In Progress"].length,
      done: grouped.Done.length,
    }),
    [grouped]
  );

  const createMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      priority: string;
      dueDate?: string;
      orderId?: string;
      notes?: string;
    }) => apiPost<Task>("/api/tasks", payload),
    onSuccess: () => {
      toast.success("Task created");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch<Task>(`/api/tasks/${id}`, { status }),
    onSuccess: (task) => {
      toast.success(`Task moved to ${task.status}`);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="p-5 md:p-8 max-w-[1300px] mx-auto w-full">
      <PageHeader
        eyebrow="Studio workflow"
        eyebrowIcon={KanbanSquare}
        title="Tasks"
        subtitle="Everything the atelier needs to do."
        actions={
          <PremiumButton onClick={() => setDialogOpen(true)} size="md">
            <Plus className="w-4 h-4" />
            New Task
          </PremiumButton>
        }
      />

      {/* Premium stat strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <PremiumMetric
          label="To Do"
          value={<AnimatedNumber value={stats.todo} />}
          icon={ListTodo}
          accent
        />
        <PremiumMetric
          label="In Progress"
          value={<AnimatedNumber value={stats.inProgress} />}
          icon={Loader2}
        />
        <PremiumMetric
          label="Done"
          value={<AnimatedNumber value={stats.done} />}
          icon={CheckCheck}
        />
      </div>

      {/* Filter bar */}
      <SectionCard bodyClassName="py-3" className="mb-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
              Staff
            </span>
            <Select value={staffFilter} onValueChange={setStaffFilter}>
              <SelectTrigger
                className="w-[180px] h-8 bg-white"
                aria-label="Filter by staff"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Staff</SelectItem>
                {staffOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.fullName}
                  </SelectItem>
                ))}
                <SelectItem value="Unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
              Priority
            </span>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger
                className="w-[160px] h-8 bg-white"
                aria-label="Filter by priority"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_FILTER_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      {/* Board */}
      {isError ? (
        <SectionCard title="Error">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <AlertCircle className="w-4 h-4 text-[#800020]" />
            Could not load tasks. Please try again.
          </div>
        </SectionCard>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="h-72" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const Icon = COLUMN_ICON[col];
            const count = grouped[col].length;
            return (
              <SectionCard
                key={col}
                bodyClassName="p-3 flex flex-col gap-2.5"
                title={col}
                action={
                  <div className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        "w-3.5 h-3.5",
                        col === "To Do" && "text-[#800020]",
                        col === "In Progress" && "text-blue-600",
                        col === "Done" && "text-[#15803D]"
                      )}
                    />
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#FBF9F7] border border-[#E7E5E4] text-[10px] font-semibold text-stone-600 tabular-nums">
                      {count}
                    </span>
                  </div>
                }
              >
                {grouped[col].length === 0 ? (
                  <EmptyState
                    className="py-8"
                    title={`No ${col.toLowerCase()} tasks`}
                    description={
                      col === "To Do"
                        ? "Create a new task to get started."
                        : "Tasks will appear here as they progress."
                    }
                  />
                ) : (
                  grouped[col].map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={(status) =>
                        statusMutation.mutate({ id: task.id, status })
                      }
                      onClick={() =>
                        task.orderId && go("order", { id: task.orderId })
                      }
                    />
                  ))
                )}
              </SectionCard>
            );
          })}
        </div>
      )}

      <NewTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        orders={orders}
        onSubmit={(payload) => createMutation.mutate(payload)}
        submitting={createMutation.isPending}
      />
    </div>
  );
}

function TaskCard({
  task,
  onStatusChange,
  onClick,
}: {
  task: TaskWithRelations;
  onStatusChange: (status: string) => void;
  onClick: () => void;
}) {
  const overdue =
    !!task.dueDate && isOverdue(task.dueDate) && task.status !== "Done";
  const garment = task.order?.garmentDesign;
  const customerName = task.order?.customer?.name;
  const staffName = task.staff?.fullName;
  const initial = staffName ? staffName.charAt(0).toUpperCase() : "?";

  return (
    <div className="rounded-lg bg-white border border-[#E7E5E4] p-3.5 elevate-sm lift flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={onClick}
          disabled={!task.orderId}
          className={cn(
            "text-left flex-1 min-w-0",
            task.orderId && "hover:underline"
          )}
        >
          <p className="text-sm font-medium text-[#1C1917] leading-snug">
            {task.title}
          </p>
        </button>
        <StatusBadge status={task.priority} />
      </div>

      {garment && (
        <button
          onClick={onClick}
          disabled={!task.orderId}
          className="text-left text-xs text-stone-500 truncate inline-flex items-center gap-1.5 hover:text-stone-700"
        >
          {task.orderId && <Link2 className="w-3 h-3 text-stone-400 shrink-0" />}
          <span className="truncate">
            {garment}
            {customerName ? ` · ${customerName}` : ""}
          </span>
        </button>
      )}

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-2 min-w-0">
          {staffName ? (
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <span className="w-5 h-5 rounded-full bg-[#800020]/10 text-[#800020] text-[10px] font-semibold flex items-center justify-center shrink-0">
                {initial}
              </span>
              <span className="text-xs text-stone-500 truncate">
                {staffName}
              </span>
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wide text-stone-400">
              Unassigned
            </span>
          )}
        </div>

        {task.dueDate && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px] shrink-0",
              overdue ? "text-amber-700 font-medium" : "text-stone-500"
            )}
          >
            {overdue ? (
              <AlertCircle className="w-3 h-3" />
            ) : (
              <CalendarDays className="w-3 h-3" />
            )}
            {shortDate(task.dueDate)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E7E5E4]/70">
        <span className="text-[10px] uppercase tracking-[0.16em] text-stone-400">
          Status
        </span>
        <Select value={task.status} onValueChange={onStatusChange}>
          <SelectTrigger size="sm" className="h-7 w-[140px] text-xs bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLUMNS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface NewTaskPayload {
  title: string;
  priority: string;
  dueDate?: string;
  orderId?: string;
  notes?: string;
}

function NewTaskDialog({
  open,
  onOpenChange,
  orders,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orders: Order[];
  onSubmit: (payload: NewTaskPayload) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<string>("Medium");
  const [dueDate, setDueDate] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("none");
  const [notes, setNotes] = useState<string>("");

  const reset = () => {
    setTitle("");
    setPriority("Medium");
    setDueDate("");
    setOrderId("none");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }
    const payload: NewTaskPayload = {
      title: title.trim(),
      priority,
    };
    if (dueDate) payload.dueDate = dueDate;
    if (orderId && orderId !== "none") payload.orderId = orderId;
    if (notes.trim()) payload.notes = notes.trim();
    onSubmit(payload);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setTimeout(reset, 150);
      }}
    >
      <DialogContent className="sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-[#1C1917]">
            New Task
          </DialogTitle>
          <DialogDescription>
            Capture a quick to-do. You can attach it to an existing order.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Source buttons for Akosua gown"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="task-priority" className="w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_LEVELS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="task-due">Due Date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                min={todayISO()}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="task-order">Linked Order</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger id="task-order" className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="none">None — general task</SelectItem>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.garmentDesign}
                    {o.customer?.name ? ` · ${o.customer.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional details, links, supplier contacts…"
              rows={3}
            />
          </div>

          <DialogFooter>
            <PremiumButton
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </PremiumButton>
            <PremiumButton type="submit" loading={submitting}>
              Create Task
            </PremiumButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
