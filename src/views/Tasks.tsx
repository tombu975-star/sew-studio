"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckSquare,
  Plus,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import { AtelierCard } from "@/components/atelier/AtelierCard";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { isOverdue, PRIORITY_LEVELS, shortDate, todayISO } from "@/lib/format";
import type { Order, Task, User } from "@/lib/types";
import { useNav } from "@/stores/nav";

interface TaskWithRelations extends Task {
  order?: (Order & { customer: Order["customer"] }) | null;
  staff?: User | null;
}

const COLUMNS = ["To Do", "In Progress", "Done"] as const;
type ColumnStatus = (typeof COLUMNS)[number];

const PRIORITY_FILTER_OPTIONS = ["All Priority", ...PRIORITY_LEVELS] as const;

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

  // Derive unique staff from tasks (those actually assigned).
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="p-5 md:p-8 max-w-[1100px] mx-auto w-full">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex w-10 h-10 rounded-full border border-[#E7E5E4] items-center justify-center bg-white">
            <CheckSquare className="w-4 h-4 text-[#800020]" />
          </div>
          <div>
            <h1
              className="font-display font-semibold text-[#1C1917] leading-tight"
              style={{ fontSize: "clamp(1.75rem, 1.2rem + 1.6vw, 2.25rem)" }}
            >
              Tasks
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Track atelier to-dos from queue to done.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm h-9"
        >
          <Plus className="w-4 h-4" /> New Task
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
            Staff
          </span>
          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="w-[170px] h-8 bg-white" aria-label="Filter by staff">
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
          <span className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
            Priority
          </span>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px] h-8 bg-white" aria-label="Filter by priority">
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

      {/* Board */}
      {isError ? (
        <div className="rounded-sm border border-[#E7E5E4] bg-white p-6 text-sm text-stone-500 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#800020]" />
          Could not load tasks. Please try again.
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-sm bg-white" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <AtelierCard
              key={col}
              title={`${col} · ${grouped[col].length}`}
              bodyClassName="p-3 flex flex-col gap-2.5"
            >
              {grouped[col].length === 0 ? (
                <div className="px-2 py-8 text-center">
                  <p className="text-xs text-stone-400">No tasks here.</p>
                </div>
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
            </AtelierCard>
          ))}
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
  const overdue = !!task.dueDate && isOverdue(task.dueDate) && task.status !== "Done";
  const garment = task.order?.garmentDesign;
  const customerName = task.order?.customer?.name;
  const staffName = task.staff?.fullName;
  const initial = staffName ? staffName.charAt(0).toUpperCase() : "?";

  return (
    <div className="border border-[#E7E5E4] rounded-sm p-3 bg-white flex flex-col gap-2">
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
          className="text-left text-xs text-stone-500 truncate hover:text-stone-700"
        >
          {garment}
          {customerName ? ` · ${customerName}` : ""}
        </button>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2 min-w-0">
          {staffName ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#800020]/10 text-[#800020] text-[10px] font-semibold flex items-center justify-center">
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
              "inline-flex items-center gap-1 text-[11px]",
              overdue ? "text-amber-700 font-medium" : "text-stone-500"
            )}
          >
            <CalendarDays className="w-3 h-3" />
            {shortDate(task.dueDate)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100">
        <span className="text-[10px] uppercase tracking-[0.16em] text-stone-400">
          Status
        </span>
        <Select
          value={task.status}
          onValueChange={onStatusChange}
        >
          <SelectTrigger size="sm" className="h-7 w-[130px] text-xs bg-white">
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
      <DialogContent className="sm:max-w-md rounded-sm">
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm"
            >
              {submitting ? "Saving…" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
