"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Sparkles,
  Star,
  Plus,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Ruler,
  Users,
  Pencil,
  Trash2,
  ShoppingBag,
  Check,
  Save,
  MoreVertical,
  ChevronRight,
  CalendarDays,
  ImageIcon,
  FileText,
  Activity,
  Heart,
  ClipboardList,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type {
  Customer,
  Order,
  MeasurementSet,
  StyleConcept,
  CustomerFeedback,
} from "@/lib/types";
import {
  ENTRY_SOURCES,
  CUSTOMER_TYPES,
  PREFERRED_STYLES,
  formatCurrency,
  formatDate,
  shortDate,
} from "@/lib/format";
import { useNav } from "@/stores/nav";
import { useRole } from "@/stores/role";
import { cn } from "@/lib/utils";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { MeasurementsPanel } from "@/components/atelier/MeasurementsPanel";
import {
  FIELD_GROUPS,
  MEASUREMENT_FIELDS,
  POSTURES,
  checkRange,
  dummyMeasurementsFor,
  fromCm,
  inputToCm,
  toCm,
  type MeasurementKey,
  type Unit as MeasureUnit,
} from "@/lib/measurements";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { ConfirmDeleteDialog } from "@/components/atelier/ConfirmDeleteDialog";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import { AnimatedNumber } from "@/components/atelier/AnimatedNumber";
import {
  EmptyState,
  SkeletonCard,
  SkeletonList,
} from "@/components/atelier/EmptyState";

const GENDERS = ["Female", "Male", "Other"];

interface CustomerDetail {
  customer: Customer;
  orders: Order[];
  measurements: MeasurementSet[];
  feedback: CustomerFeedback[];
  styleConcepts: StyleConcept[];
  quotes?: { id: string; garment: string; total: number; createdAt: string; validUntil?: string | null }[];
}

/** wa.me needs an international number: 024… becomes 233 24… (Ghana). */
function whatsappHref(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (!d) return "";
  return `https://wa.me/${d.startsWith("0") ? `233${d.slice(1)}` : d}`;
}

export default function CustomerProfile() {
  const { selectedId, go } = useNav();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const owner = useRole((s) => s.isOwner)();
  const canSeeMoney = useRole((s) => s.canSeeBusiness)();
  const canCreate = useRole((s) => s.canCreateOrders)();
  const [tab, setTab] = useState("overview");
  const [showAllConcepts, setShowAllConcepts] = useState(false);

  const deleteMut = useMutation({
    mutationFn: () => apiDelete(`/api/customers/${selectedId}`),
    onSuccess: () => {
      toast.success("Customer deleted");
      setDeleteOpen(false);
      qc.removeQueries({ queryKey: ["customer", selectedId] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      go("customers");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data, isLoading, isError, refetch } = useQuery<CustomerDetail>({
    queryKey: ["customer", selectedId],
    queryFn: () => {
      if (!selectedId) throw new Error("No customer selected");
      return apiGet<CustomerDetail>(`/api/customers/${selectedId}`);
    },
    enabled: !!selectedId,
  });

  const [activityKind, setActivityKind] = useState("note");
  const [activitySubject, setActivitySubject] = useState("");
  const [activityDetails, setActivityDetails] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [alterationOrder, setAlterationOrder] = useState("");
  const [alterationDescription, setAlterationDescription] = useState("");
  const [alterationDue, setAlterationDue] = useState("");
  const [documentCategory, setDocumentCategory] = useState("other");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentUploading, setDocumentUploading] = useState(false);
  const { data: interactions = [] } = useQuery<{ id: string; kind: string; subject: string; details: string | null; occurredAt: string }[]>({
    queryKey: ["customer-interactions", selectedId],
    queryFn: () => apiGet(`/api/customers/${selectedId}/interactions`),
    enabled: !!selectedId,
  });
  const addInteraction = useMutation({
    mutationFn: () => apiPost(`/api/customers/${selectedId}/interactions`, { kind: activityKind, subject: activitySubject, details: activityDetails, ...(activityKind === "appointment" && activityDate ? { occurredAt: new Date(activityDate).toISOString() } : {}) }),
    onSuccess: () => { setActivitySubject(""); setActivityDetails(""); setActivityDate(""); qc.invalidateQueries({ queryKey: ["customer-interactions", selectedId] }); toast.success("Customer activity saved"); },
    onError: (error: Error) => toast.error(error.message),
  });

  const { data: customerDocuments = [] } = useQuery<{ id:string; name:string; category:string; createdAt:string; url:string }[]>({
    queryKey: ["customer-documents", selectedId],
    queryFn: () => apiGet(`/api/customers/${selectedId}/documents`),
    enabled: !!selectedId,
  });
  const uploadDocument = async () => {
    if (!documentFile || !selectedId) return;
    setDocumentUploading(true);
    try {
      const form = new FormData();
      form.append("file", documentFile);
      form.append("category", documentCategory);
      const response = await fetch(`/api/customers/${selectedId}/documents`, { method:"POST", body:form, credentials:"same-origin" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Upload failed");
      setDocumentFile(null);
      qc.invalidateQueries({ queryKey:["customer-documents", selectedId] });
      toast.success("Document uploaded");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed"); }
    finally { setDocumentUploading(false); }
  };

  const { data: alterationRecords = [] } = useQuery<{id:string;orderId:string;garment:string;description:string;status:string;dueDate:string|null;assignedTo:string|null;createdAt:string}[]>({
    queryKey:["customer-alterations",selectedId],
    queryFn:()=>apiGet(`/api/customers/${selectedId}/alterations`),
    enabled:!!selectedId,
  });
  const { data: alterationStaff = [] } = useQuery<{id:string;name:string}[]>({
    queryKey:["alteration-staff",selectedId],
    queryFn:()=>apiGet(`/api/customers/${selectedId}/alterations/staff`),
    enabled:!!selectedId && (owner || canCreate),
  });
  const addAlteration = useMutation({
    mutationFn:()=>apiPost(`/api/customers/${selectedId}/alterations`,{orderId:alterationOrder,description:alterationDescription,dueDate:alterationDue||null}),
    onSuccess:()=>{setAlterationDescription("");setAlterationDue("");qc.invalidateQueries({queryKey:["customer-alterations",selectedId]});toast.success("Alteration request created");},
    onError:(e:Error)=>toast.error(e.message),
  });
  const updateAlteration = useMutation({
    mutationFn:({id,status,assignedTo}:{id:string;status:string;assignedTo?:string})=>apiPatch(`/api/customers/${selectedId}/alterations`,{id,status,...(assignedTo?{assignedTo}:{})}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["customer-alterations",selectedId]});toast.success("Alteration updated");},
    onError:(e:Error)=>toast.error(e.message),
  });

  if (!selectedId) {
    return (
      <div className="p-4 sm:p-5 md:p-8 max-w-[1200px] mx-auto w-full">
        <SectionCard bodyClassName="p-0">
          <EmptyState
            icon={Users}
            title="Select a customer"
            description="Choose a client from your roster to view their profile, orders, and style details."
            action={
              <PremiumButton
                variant="primary"
                size="sm"
                onClick={() => go("customers")}
              >
                <Users className="w-4 h-4" /> Browse Customers
              </PremiumButton>
            }
          />
        </SectionCard>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-5 md:p-8 max-w-[1200px] mx-auto w-full">
        <div className="h-4 w-32 bg-stone-100 rounded shimmer mb-4" />
        <div className="rounded-xl surface-premium border border-[#EEDFE3] p-6 mb-6 flex gap-5 elevate-sm">
          <div className="w-16 h-16 rounded-full shimmer" />
          <div className="flex-1 space-y-3">
            <div className="h-7 w-56 shimmer rounded" />
            <div className="h-4 w-80 shimmer rounded" />
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="mt-4">
          <SkeletonList rows={3} />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-4 sm:p-5 md:p-8 max-w-[1200px] mx-auto w-full">
        <button
          onClick={() => go("customers")}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-[#800020] mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Customers
        </button>
        <SectionCard bodyClassName="p-0">
          <EmptyState
            icon={Users}
            title="We couldn't load this profile"
            description="Something went wrong fetching this customer. Please try again."
            action={
              <PremiumButton
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                Try again
              </PremiumButton>
            }
          />
        </SectionCard>
      </div>
    );
  }

  const { customer, orders, measurements, feedback, styleConcepts } = data;
  const quotes = data.quotes ?? [];

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ["customer", selectedId] });
    qc.invalidateQueries({ queryKey: ["customers"] });
    setEditOpen(false);
    toast.success("Customer updated");
  };

  const handleMeasurementSaved = () => {
    qc.invalidateQueries({ queryKey: ["customer", selectedId] });
    setMeasureOpen(false);
    toast.success("Measurements added");
  };

  const firstName = (customer.name || "").split(" ")[0] || customer.name;
  const visibleConcepts = showAllConcepts ? styleConcepts : styleConcepts.slice(0, 4);
  const newOrder = () => go("new-order", { params: { customerId: selectedId } });
  const openOrder = (id: string) => go("order", { id });

  // At-a-glance numbers for the strip under the header.
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
  );
  const latestOrder = sortedOrders[0];
  const inProgress = orders.filter((o) => !FINISHED.has(o.status)).length;
  const bookedValue = orders.reduce((n, o) => n + (Number(o.sellingPrice) || 0), 0);
  const stats: { label: string; value: string; hideOnPhone?: boolean }[] = [
    { label: "Orders", value: String(orders.length) },
    { label: "In progress", value: String(inProgress) },
    ...(canSeeMoney ? [{ label: "Booked", value: formatCurrency(bookedValue) }] : []),
    { label: "Last order", value: latestOrder ? shortDate(latestOrder.orderDate) : "None", hideOnPhone: canSeeMoney },
  ];

  const details: { label: string; value: string | null | undefined; wide?: boolean; href?: string }[] = [
    { label: "Phone", value: customer.phone, wide: true, href: customer.phone ? `tel:${customer.phone.replace(/[^\d+]/g, "")}` : undefined },
    { label: "WhatsApp", value: customer.whatsapp, wide: true, href: customer.whatsapp ? whatsappHref(customer.whatsapp) : undefined },
    { label: "Email", value: customer.email, wide: true, href: customer.email ? `mailto:${customer.email}` : undefined },
    { label: "Occupation", value: customer.occupation },
    { label: "Gender", value: customer.gender },
    { label: "Height / weight", value: customer.height || customer.weight ? `${customer.height ?? "—"} cm / ${customer.weight ?? "—"} kg` : null },
    { label: "Preferred fit", value: customer.preferredFit },
    { label: "Skin tone", value: customer.skinTone },
    { label: "Found us via", value: customer.entrySource ? `${customer.entrySource}${customer.referredBy ? ` (${customer.referredBy})` : ""}` : null },
  ].filter((d) => !!d.value);

  const styleGroups = [
    { label: "Favourite colours", value: customer.favouriteColours },
    { label: "Colours to avoid", value: customer.coloursToAvoid },
    { label: "Favourite fabrics", value: customer.favouriteFabrics },
    { label: "Preferred styles", value: customer.preferredStyles },
  ].filter((g) => !!g.value);

  const latestMeasurements = [...measurements].sort((a, b) => new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime())[0];
  const completedOrders = orders.filter((o) => FINISHED.has(o.status)).length;
  const pendingOrders = orders.filter((o) => /pending|new|quoted|awaiting/i.test(o.status)).length;
  const fittings = orders.flatMap((o) => (o.fittings ?? []).map((f) => ({ ...f, garment: o.garmentDesign, orderId: o.id })));
  const upcomingFittings = fittings.filter((f) => !/complete|done|cancel/i.test(f.status) && new Date(f.date).getTime() >= new Date().setHours(0,0,0,0));
  const completedFittings = fittings.filter((f) => /complete|done/i.test(f.status));
  const alterations = alterationRecords.filter((a) => !["Completed","Cancelled"].includes(a.status));
  const overdueAlterations = alterations.filter((a) => a.dueDate && new Date(a.dueDate).getTime() < new Date().setHours(0,0,0,0));
  const gallery = [
    ...styleConcepts.filter((c) => !!c.imageUrl).map((c) => ({ id: c.id, url: c.imageUrl!, title: c.conceptName })),
    ...orders.filter((o) => !!o.designImage).map((o) => ({ id: o.id, url: o.designImage!, title: o.garmentDesign })),
  ];
  const appointments = interactions.filter((a) => a.kind === "appointment");
  const upcomingAppointments = appointments.filter((a) => new Date(a.occurredAt).getTime() >= Date.now()).sort((a,b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  const recentActivity = [
    ...alterationRecords.map((a) => ({ id: `alteration-${a.id}`, title: `Alteration: ${a.garment} · ${a.status}`, date: a.createdAt, tab: "alterations" })),
    ...interactions.map((a) => ({ id: `interaction-${a.id}`, title: `${a.kind}: ${a.subject}`, date: a.occurredAt, tab: "activity" })),
    ...orders.map((o) => ({ id: `order-${o.id}`, title: `Order: ${o.garmentDesign}`, date: o.updatedAt ?? o.orderDate, tab: "orders" })),
    ...measurements.map((m) => ({ id: `measurement-${m.id}`, title: "Measurements recorded", date: m.dateTaken, tab: "measurements" })),
    ...feedback.map((f) => ({ id: `feedback-${f.id}`, title: `Customer feedback · ${f.rating}/5`, date: f.date, tab: "feedback" })),
    ...fittings.map((f) => ({ id: `fitting-${f.id}`, title: `Fitting: ${f.garment}`, date: f.date, tab: "fittings" })),
  ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const snapshotCards = [
    { key: "personal", title: "Personal details", icon: UserRound, summary: customer.name, lines: [customer.phone, customer.email, [customer.city, customer.country].filter(Boolean).join(", ")].filter(Boolean) as string[], action: "View details" },
    { key: "measurements", title: "Measurements", icon: Ruler, summary: latestMeasurements ? `Updated ${shortDate(latestMeasurements.dateTaken)}` : "No measurements recorded", lines: latestMeasurements ? (["bust", "waist", "hip"] as const).filter((k) => latestMeasurements[k] != null).map((k) => `${k}: ${latestMeasurements[k]} ${latestMeasurements.unit || "cm"}`) : [], action: "View measurements" },
    { key: "fit", title: "Proportions & fit", icon: ClipboardList, summary: customer.preferredFit || "Fit preference not recorded", lines: [latestMeasurements?.posture && `Posture: ${latestMeasurements.posture}`, latestMeasurements?.notes, customer.styleNotes].filter(Boolean) as string[], action: "View fit details" },
    { key: "style", title: "Style profile", icon: Sparkles, summary: customer.preferredStyles || "No preferred styles recorded", lines: [customer.favouriteColours && `Colours: ${customer.favouriteColours}`, customer.favouriteFabrics && `Fabrics: ${customer.favouriteFabrics}`, customer.designPreferences].filter(Boolean) as string[], action: "View style" },
    { key: "orders", title: "Orders", icon: ShoppingBag, summary: `${orders.length} total · ${inProgress} active`, lines: [`${completedOrders} completed · ${pendingOrders} pending`, latestOrder && `Latest: ${latestOrder.garmentDesign}`].filter(Boolean) as string[], action: "View orders" },
    { key: "fittings", title: "Fittings", icon: CalendarDays, summary: `${upcomingFittings.length} upcoming · ${completedFittings.length} completed`, lines: [`${alterations.length} open alterations · ${overdueAlterations.length} overdue`, upcomingFittings[0] && `Next fitting: ${shortDate(upcomingFittings[0].date)}`, upcomingAppointments[0] && `Next appointment: ${shortDate(upcomingAppointments[0].occurredAt)}`].filter(Boolean) as string[], action: "View fittings" },
    { key: "gallery", title: "Gallery", icon: ImageIcon, summary: `${gallery.length} saved images`, lines: gallery.slice(0,2).map((g) => g.title), action: "View gallery" },
    { key: "documents", title: "Documents", icon: FileText, summary: `${quotes.length} quotations · ${customerDocuments.length} files`, lines: [...quotes.slice(0,1).map((q) => `${q.garment} · ${shortDate(q.createdAt)}`), ...customerDocuments.slice(0,2).map((d) => `${d.category}: ${d.name}`)], action: "View documents" },
    { key: "feedback", title: "Feedback", icon: Heart, summary: `${feedback.length} feedback entries`, lines: [...feedback].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0,1).map((f) => `${f.rating}/5 · ${f.feedback || f.type}`), action: "View feedback" },
    { key: "activity", title: "Recent activity", icon: Activity, summary: `${recentActivity.length} recorded events`, lines: [upcomingAppointments.length ? `${upcomingAppointments.length} upcoming appointments` : "", ...recentActivity.slice(0,2).map((a) => `${shortDate(a.date)} · ${a.title}`)].filter(Boolean), action: "View activity" },
  ];
  const quickAction =
    "grid size-10 shrink-0 place-items-center rounded-lg border border-[#E6D4D8] bg-white text-[#650019] transition-colors hover:bg-[#FBF1F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79A45]";

  return (
    <div className="p-4 sm:p-5 md:p-8 max-w-[1200px] mx-auto w-full">
      {/* Back link */}
      <button
        onClick={() => go("customers")}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-[#800020]"
      >
        <ArrowLeft className="w-4 h-4" /> Customers
      </button>

      {/* Client card: identity, quick actions and key numbers in one compact block */}
      <div className="mb-4 overflow-hidden rounded-lg border border-[#E4DEDD] bg-white">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#800020] font-display text-xl font-semibold text-white sm:size-14 sm:text-2xl"
              aria-hidden
            >
              {(customer.name || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2
                className="font-sans font-semibold leading-tight text-[#30272A] break-words"
                style={{ fontSize: "clamp(20px, 5vw, 28px)" }}
              >
                {customer.name}
              </h2>
              <p className="mt-0.5 truncate text-xs text-stone-500">
                {[customer.city, `Client since ${shortDate(customer.createdAt)}`].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {customer.customerType && <StatusBadge status={customer.customerType} />}
                {customer.status && customer.status !== "Active" && <StatusBadge status={customer.status} />}
                <span className="inline-flex items-center gap-1 rounded-md border border-[#800020]/20 bg-[#800020]/8 px-2 py-0.5 text-xs text-[#800020]">
                  <Sparkles className="h-3 w-3" />
                  <span className="font-semibold">
                    <AnimatedNumber value={customer.loyaltyPoints ?? 0} /> pts
                  </span>
                </span>
              </div>
            </div>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More actions"
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-stone-500 hover:bg-[#F7EFF1] hover:text-[#2F151B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79A45]"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
                <DropdownMenuItem onSelect={() => setEditOpen(true)} className="min-h-10 gap-2">
                  <Pencil className="h-4 w-4" /> Edit details
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setMeasureOpen(true)} className="min-h-10 gap-2">
                  <Ruler className="h-4 w-4" /> New measurement session
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => go("style-assist", { id: selectedId })} className="min-h-10 gap-2">
                  <Sparkles className="h-4 w-4" /> Open Style Assist
                </DropdownMenuItem>
                {owner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => setDeleteOpen(true)}
                      className="min-h-10 gap-2 text-red-700 focus:bg-red-50 focus:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" /> Delete customer
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Quick actions: one tap to call, message or start an order */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {customer.phone && (
              <a href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`} aria-label={`Call ${firstName}`} title="Call" className={quickAction}>
                <Phone className="h-4 w-4" />
              </a>
            )}
            {customer.whatsapp && (
              <a href={whatsappHref(customer.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${firstName}`} title="WhatsApp" className={quickAction}>
                <MessageSquare className="h-4 w-4" />
              </a>
            )}
            {customer.email && (
              <a href={`mailto:${customer.email}`} aria-label={`Email ${firstName}`} title="Email" className={quickAction}>
                <Mail className="h-4 w-4" />
              </a>
            )}
            <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
              <PremiumButton variant="outline" size="md" onClick={() => setEditOpen(true)} className="hidden md:inline-flex">
                <Pencil className="h-4 w-4" /> Edit
              </PremiumButton>
              {canCreate ? (
                <>
                  <PremiumButton variant="outline" size="md" onClick={() => go("style-assist", { id: selectedId })} className="hidden md:inline-flex">
                    <Sparkles className="h-4 w-4" /> Style Assist
                  </PremiumButton>
                  <PremiumButton variant="primary" size="md" onClick={newOrder} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4" /> New order
                  </PremiumButton>
                </>
              ) : (
                <PremiumButton variant="primary" size="md" onClick={() => go("style-assist", { id: selectedId })} className="w-full sm:w-auto">
                  <Sparkles className="h-4 w-4" /> Style Assist
                </PremiumButton>
              )}
            </div>
          </div>
        </div>

        <dl data-keep-cols className={cn("grid divide-x divide-[#EEDFE3] border-t border-[#EEDFE3] bg-[#FDF9FA]", canSeeMoney ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-3")}>
          {stats.map((st) => (
            <div key={st.label} className={cn("min-w-0 px-3 py-2.5 sm:px-5", st.hideOnPhone && "hidden sm:block")}>
              <dd className="break-words text-sm font-semibold tabular-nums text-[#2F151B] sm:text-base">{st.value}</dd>
              <dt className="text-xs leading-tight text-stone-600">{st.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      {/* Sections */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex h-auto min-w-0 w-full max-w-full flex-nowrap justify-start gap-1 overflow-x-auto overscroll-x-contain rounded-lg border border-[#EEDFE3] bg-white p-1 scroll-slim [scrollbar-width:thin] [-webkit-overflow-scrolling:touch] sm:w-full">
          {[
            { v: "overview", l: "Overview", n: null },
            { v: "orders", l: "Orders", n: orders.length },
            { v: "measurements", l: "Measurements", n: measurements.length },
            { v: "style", l: "Style", n: styleConcepts.length },
            { v: "fittings", l: "Fittings", n: fittings.length },
            { v: "alterations", l: "Alterations", n: alterationRecords.length },
            { v: "gallery", l: "Gallery", n: gallery.length },
            { v: "documents", l: "Documents", n: null },
            { v: "feedback", l: "Feedback", n: feedback.length },
            { v: "activity", l: "Activity", n: null },
            { v: "notes", l: "Notes", n: null },
          ].map((t) => (
            <TabsTrigger
              key={t.v}
              value={t.v}
              className="min-h-10 !w-auto !min-w-max !max-w-none !shrink-0 !grow-0 !basis-auto whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-medium text-stone-600 data-[state=active]:bg-[#F5E9ED] data-[state=active]:text-[#800020] sm:px-4 sm:py-1.5"
            >
              {t.l}
              {t.n ? <span className="ml-1.5 text-xs tabular-nums opacity-70">{t.n}</span> : null}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Customer 360: all ten sections at a glance, with direct navigation. */}
        <TabsContent value="overview" className="mt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div><h3 className="font-display text-xl font-semibold text-[#351322]">Customer at a glance</h3><p className="text-xs text-stone-500">A connected summary of the information recorded for {firstName}.</p></div>
            
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {snapshotCards.map((card) => {
              const Icon = card.icon;
              return <button key={card.key} type="button" onClick={() => card.key === "personal" ? setEditOpen(true) : card.key === "fit" ? setTab("measurements") : setTab(card.key)}
                className="group flex min-h-[140px] flex-col rounded-lg border border-[#E4DEDD] bg-white p-4 text-left transition-colors hover:bg-[#FAF8F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020]">
                <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-lg bg-[#800020]/10 text-[#800020]"><Icon className="size-4.5" /></span><h4 className="text-sm font-semibold text-[#351322]">{card.title}</h4><ChevronRight className="ml-auto size-4 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-[#800020]"/></div>
                <p className="mt-3 line-clamp-2 text-sm font-medium text-[#493A40]">{card.summary}</p>
                <div className="mt-1 space-y-0.5">{card.lines.slice(0,3).map((line,i) => <p key={i} className="break-words text-xs text-stone-600">{line}</p>)}</div>
                {card.key === "gallery" && gallery.length > 0 && <div className="mt-2 flex gap-1.5">{gallery.slice(0,3).map((image) => <img key={image.id} src={image.url} alt={image.title} loading="lazy" className="size-11 rounded-md border border-[#EEDFE3] object-cover"/>)}</div>}
                <span className="mt-auto pt-3 text-xs font-semibold text-[#800020]">{card.action} →</span>
              </button>;
            })}
          </div>
        </TabsContent>

        {/* Orders */}
        <TabsContent value="orders" className="mt-3">
          <SectionCard
            title={`Orders · ${orders.length}`}
            bodyClassName="p-0"
            action={
              canCreate ? (
                <PremiumButton variant="primary" size="sm" onClick={newOrder}>
                  <Plus className="h-3.5 w-3.5" /> New order
                </PremiumButton>
              ) : undefined
            }
          >
            {orders.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No orders yet"
                description={`Start a new order for ${firstName}.`}
                action={
                  canCreate ? (
                    <PremiumButton variant="primary" size="sm" onClick={newOrder}>
                      <Plus className="h-3.5 w-3.5" /> New order for {firstName}
                    </PremiumButton>
                  ) : undefined
                }
              />
            ) : (
              <div className="divide-y divide-[#EEDFE3]/70">
                {sortedOrders.map((o) => (
                  <OrderRow key={o.id} o={o} showPrice={canSeeMoney} onOpen={openOrder} />
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* Measurements: fixed layout, same for every customer */}
        <TabsContent value="measurements" className="mt-3">
          <MeasurementsPanel
            measurements={measurements}
            onUpdate={() => setMeasureOpen(true)}
            customerGender={customer.gender}
          />
        </TabsContent>

        {/* Style */}
        <TabsContent value="style" className="mt-3">
          <SectionCard
            title="Saved Concepts"
            action={
              <PremiumButton
                variant="primary"
                size="sm"
                onClick={() => go("style-assist", { id: selectedId })}
              >
                <Sparkles className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Generate&nbsp;</span>Concepts
              </PremiumButton>
            }
          >
            {styleConcepts.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No concepts yet — try Style Assist"
                description="Generate AI-powered design concepts tailored to this customer's preferences."
                action={
                  <PremiumButton
                    variant="primary"
                    size="sm"
                    onClick={() => go("style-assist", { id: selectedId })}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Open Style Assist
                  </PremiumButton>
                }
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {visibleConcepts.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "rounded-lg border border-[#EEDFE3] surface-premium lift overflow-hidden flex flex-col",
                      c.status === "Rejected" && "opacity-60"
                    )}
                  >
                    {c.imageUrl && (
                      <div className="aspect-[3/4] w-full bg-[#FAF0F2] border-b border-[#EEDFE3]">
                        <img
                          src={c.imageUrl}
                          alt={c.conceptName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-display text-base text-[#2F151B] leading-tight">
                          {c.conceptName}
                        </div>
                        {typeof c.matchPercent === "number" && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.15em] bg-[#800020]/10 text-[#800020] px-2 py-0.5 rounded-md border border-[#800020]/25 font-semibold">
                            {c.matchPercent}% match
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <StatusBadge status={c.status} />
                        {c.garmentType && (
                          <span className="text-[11px] uppercase tracking-[0.15em] text-stone-400">
                            {c.garmentType}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500 space-y-0.5 mb-3">
                        {c.silhouette && (
                          <div>
                            <span className="text-stone-400">Silhouette:</span>{" "}
                            {c.silhouette}
                          </div>
                        )}
                        {c.fabric && (
                          <div>
                            <span className="text-stone-400">Fabric:</span>{" "}
                            {c.fabric}
                          </div>
                        )}
                        {c.colour && (
                          <div>
                            <span className="text-stone-400">Colour:</span>{" "}
                            {c.colour}
                          </div>
                        )}
                      </div>
                      {c.whyThisMayWork && (
                        <div className="mt-auto text-xs text-stone-600 italic bg-[#FAF0F2] border border-[#EEDFE3]/70 rounded-md p-2.5">
                          {c.whyThisMayWork}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {styleConcepts.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllConcepts((v) => !v)}
                className="mt-4 w-full rounded-lg border border-[#E6D4D8] py-2.5 text-sm font-medium text-[#650019] hover:bg-[#FBF1F3]"
              >
                {showAllConcepts ? "Show fewer" : `Show all ${styleConcepts.length} concepts`}
              </button>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="fittings" className="mt-3"><SectionCard title={`Fittings · ${fittings.length}`}>
          {fittings.length ? <div className="divide-y divide-[#EEDFE3]">{fittings.map((f) => <button key={f.id} onClick={() => openOrder(f.orderId)} className="flex w-full items-center justify-between gap-3 py-3 text-left hover:text-[#800020]"><span><span className="block text-sm font-medium">{f.garment}</span><span className="text-xs text-stone-500">{shortDate(f.date)} · {f.status}{f.notes ? ` · ${f.notes}` : ""}</span></span><ChevronRight className="size-4 shrink-0"/></button>)}</div> : <p className="text-sm text-stone-500">No fittings are linked to the loaded orders.</p>}
        </SectionCard></TabsContent>
        <TabsContent value="alterations" className="mt-3"><SectionCard title={`Alterations · ${alterationRecords.length}`}>
          {(owner || canCreate) && <form onSubmit={(e)=>{e.preventDefault();addAlteration.mutate();}} className="mb-5 space-y-3 rounded-lg border border-[#EEDFE3] bg-[#FDF9FA] p-4">
            <h4 className="text-sm font-semibold text-[#351322]">New alteration request</h4>
            <label className="block text-xs text-stone-600">Order<select required value={alterationOrder} onChange={(e)=>setAlterationOrder(e.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-[#EEDFE3] bg-white px-3 text-sm"><option value="">Select order</option>{orders.map((o)=><option key={o.id} value={o.id}>{o.garmentDesign} · {shortDate(o.orderDate)}</option>)}</select></label>
            <label className="block text-xs text-stone-600">Alteration required<textarea required maxLength={2000} rows={2} value={alterationDescription} onChange={(e)=>setAlterationDescription(e.target.value)} className="mt-1 block w-full rounded-lg border border-[#EEDFE3] bg-white p-3 text-sm"/></label>
            <label className="block text-xs text-stone-600">Due date (optional)<input type="date" value={alterationDue} onChange={(e)=>setAlterationDue(e.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-[#EEDFE3] bg-white px-3 text-sm"/></label>
            <button type="submit" disabled={!alterationOrder||!alterationDescription.trim()||addAlteration.isPending} className="rounded-lg bg-[#800020] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Create alteration</button>
          </form>}
          {overdueAlterations.length > 0 && <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900">{overdueAlterations.length} overdue alteration{overdueAlterations.length===1?"":"s"} require attention.</p>}
          {alterationRecords.length ? <div className="divide-y divide-[#EEDFE3]">{alterationRecords.map((a)=><div key={a.id} className="space-y-2 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={()=>openOrder(a.orderId)} className="text-sm font-semibold text-[#351322] hover:text-[#800020]">{a.garment} <ChevronRight className="inline size-3"/></button><span className="text-xs text-stone-500">{a.dueDate ? `Due ${shortDate(a.dueDate)}` : "No due date"}</span></div><p className="text-sm text-stone-600">{a.description}</p><div className="flex items-center gap-2">{(owner||canCreate) && <label className="text-xs text-stone-600">Designer <select aria-label={`Designer for ${a.garment}`} value={a.assignedTo ?? ""} disabled={updateAlteration.isPending} onChange={(e)=>{if(e.target.value)updateAlteration.mutate({id:a.id,status:a.status==="Requested"?"Assigned":a.status,assignedTo:e.target.value});}} className="ml-1 rounded-md border border-[#EEDFE3] bg-white px-2 py-1.5 text-xs"><option value="">Unassigned</option>{alterationStaff.map((member)=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label>}
          <span className="text-xs text-stone-500">Status</span>{(owner||canCreate) ? <select aria-label={`Status for ${a.garment}`} value={a.status} disabled={updateAlteration.isPending} onChange={(e)=>updateAlteration.mutate({id:a.id,status:e.target.value})} className="rounded-md border border-[#EEDFE3] bg-white px-2 py-1.5 text-xs">{["Requested","Assigned","In Progress","Ready","Completed","Cancelled"].map((v)=><option key={v}>{v}</option>)}</select> : <span className="text-xs font-medium text-[#800020]">{a.status}</span>}</div></div>)}</div> : <p className="text-sm text-stone-500">No alteration requests recorded.</p>}
        </SectionCard></TabsContent>
        <TabsContent value="gallery" className="mt-3"><SectionCard title={`Saved images · ${gallery.length}`}>
          {gallery.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{gallery.map((item) => <div key={item.id} className="overflow-hidden rounded-lg border border-[#EEDFE3]"><img src={item.url} alt={item.title} loading="lazy" className="aspect-square w-full object-cover"/><p className="truncate p-2 text-xs text-stone-600">{item.title}</p></div>)}</div> : <p className="text-sm text-stone-500">No garment or concept images have been saved.</p>}
        </SectionCard></TabsContent>
        <TabsContent value="documents" className="mt-3"><SectionCard title="Customer documents">
          {(owner || canCreate) && <div className="mb-5 space-y-3 rounded-lg border border-[#EEDFE3] bg-[#FDF9FA] p-4">
            <p className="text-sm font-semibold text-[#351322]">Upload a document</p>
            <label className="block text-xs text-stone-600">Category<select value={documentCategory} onChange={(e) => setDocumentCategory(e.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-[#EEDFE3] bg-white px-3 text-sm"><option value="sketch">Sketch</option><option value="invoice">Invoice</option><option value="quotation">Quotation</option><option value="fitting_photo">Fitting photograph</option><option value="other">Other</option></select></label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" aria-label="Choose customer document" onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#F2E4E8] file:px-3 file:py-2 file:text-[#800020]"/>
            <button type="button" disabled={!documentFile || documentUploading} onClick={uploadDocument} className="rounded-lg bg-[#800020] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{documentUploading ? "Uploading…" : "Upload document"}</button>
            <p className="text-xs text-stone-500">PDF, JPG, PNG or WebP · maximum 8 MB. Accessible only to signed-in studio members.</p>
          </div>}
          {customerDocuments.length > 0 && <div className="divide-y divide-[#EEDFE3]">{customerDocuments.map((d) => <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 py-3 hover:text-[#800020]"><span><span className="block break-all text-sm font-medium">{d.name}</span><span className="text-xs text-stone-500">{d.category.replace(/_/g," ")} · {shortDate(d.createdAt)}</span></span><ChevronRight className="size-4 shrink-0"/></a>)}</div>}
          {quotes.length > 0 && <div className="mt-4 border-t border-[#EEDFE3] pt-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Saved quotations</p>{quotes.map((q) => <div key={q.id} className="flex items-center justify-between gap-3 py-2"><span className="text-sm">{q.garment} · {shortDate(q.createdAt)}</span>{canSeeMoney && <span className="text-sm font-medium">{formatCurrency(q.total)}</span>}</div>)}</div>}
          {!customerDocuments.length && !quotes.length && <p className="text-sm text-stone-500">No documents have been added for this customer.</p>}
        </SectionCard></TabsContent>
        <TabsContent value="feedback" className="mt-3"><SectionCard title={`Customer feedback · ${feedback.length}`}>
          {feedback.length ? <div className="space-y-4">{[...feedback].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((f) => <div key={f.id} className="border-b border-[#EEDFE3] pb-3"><div className="flex items-center justify-between gap-2"><Stars value={f.rating}/><span className="text-xs text-stone-500">{shortDate(f.date)}</span></div><p className="mt-1 text-xs font-semibold text-[#800020]">{f.type}</p><p className="mt-1 text-sm text-stone-600">{f.feedback || "No written comment"}</p></div>)}</div> : <p className="text-sm text-stone-500">No customer feedback recorded yet.</p>}
        </SectionCard></TabsContent>
        <TabsContent value="activity" className="mt-3"><SectionCard title="Recent customer activity">
          {upcomingAppointments.length > 0 && <div className="mb-4 rounded-lg border border-[#E6D4D8] bg-[#FDF9FA] p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#800020]">Upcoming appointments</p>{upcomingAppointments.slice(0,5).map((a) => <div key={a.id} className="flex flex-wrap justify-between gap-2 py-1 text-sm"><span>{a.subject}</span><time className="text-stone-500">{new Date(a.occurredAt).toLocaleString()}</time></div>)}</div>}
          {recentActivity.length ? <div className="divide-y divide-[#EEDFE3]">{recentActivity.slice(0,30).map((item) => <button key={item.id} onClick={() => setTab(item.tab)} className="flex w-full items-center justify-between gap-3 py-3 text-left hover:text-[#800020]"><span className="text-sm">{item.title}</span><span className="shrink-0 text-xs text-stone-500">{shortDate(item.date)}</span></button>)}</div> : <p className="text-sm text-stone-500">No recorded order, measurement, fitting or feedback activity.</p>}
          {(owner || canCreate) && <form onSubmit={(event) => { event.preventDefault(); if (activitySubject.trim()) addInteraction.mutate(); }} className="mt-5 space-y-3 rounded-xl border border-[#EEDFE3] bg-[#FDF9FA] p-4">
            <h4 className="text-sm font-semibold text-[#351322]">Record an interaction or appointment</h4>
            <label className="block text-xs font-medium text-stone-600">Type<select value={activityKind} onChange={(event) => setActivityKind(event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-[#EEDFE3] bg-white px-3 text-sm"><option value="note">Note</option><option value="call">Call</option><option value="message">Message</option><option value="appointment">Appointment</option><option value="visit">Visit</option></select></label>
            <label className="block text-xs font-medium text-stone-600">Subject<input required maxLength={200} value={activitySubject} onChange={(event) => setActivitySubject(event.target.value)} placeholder="e.g. Confirmed fitting appointment" className="mt-1 block h-10 w-full rounded-lg border border-[#EEDFE3] bg-white px-3 text-sm"/></label>
            {activityKind === "appointment" && <label className="block text-xs font-medium text-stone-600">Appointment date and time<input type="datetime-local" required value={activityDate} onChange={(event) => setActivityDate(event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-[#EEDFE3] bg-white px-3 text-sm"/></label>}
            <label className="block text-xs font-medium text-stone-600">Details (optional)<textarea maxLength={3000} rows={2} value={activityDetails} onChange={(event) => setActivityDetails(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#EEDFE3] bg-white p-3 text-sm"/></label>
            <button type="submit" disabled={addInteraction.isPending || !activitySubject.trim() || (activityKind === "appointment" && !activityDate)} className="rounded-lg bg-[#800020] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Save activity</button>
          </form>}
          <p className="mt-3 text-xs text-stone-400">Timeline combines order, measurement, fitting, feedback and manually recorded interactions.</p>
        </SectionCard></TabsContent>

        {/* Notes: one editor with a switch, instead of two stacked cards */}
        <TabsContent value="notes" className="mt-3">
          <NotesPanel customer={customer} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {owner && (
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete this customer?"
          description={
            <>
              <strong>{customer.name}</strong> will be permanently removed along with their
              measurements, feedback, style concepts and{" "}
              {orders.length > 0
                ? `all ${orders.length} of their order${orders.length === 1 ? "" : "s"} (with payments and fittings)`
                : "any orders"}
              . This can&apos;t be undone.
            </>
          }
          confirmLabel="Delete customer"
          loading={deleteMut.isPending}
          onConfirm={() => deleteMut.mutate()}
        />
      )}
      <EditPersonalDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
        onSaved={handleSaved}
      />
      <AddMeasurementDialog
        open={measureOpen}
        onOpenChange={setMeasureOpen}
        customerId={selectedId}
        customerGender={customer.gender}
        latest={measurements[0]}
        onSaved={handleMeasurementSaved}
      />
    </div>
  );
}

/** Orders that are done and no longer need attention. */
const FINISHED = new Set<string>(["Collected/Delivered", "Completed"]);

/** One order as a compact, tappable card: image, name and price, then status and dates. */
function OrderRow({ o, showPrice, onOpen }: { o: Order; showPrice: boolean; onOpen: (id: string) => void }) {
  return (
    <button
      onClick={() => onOpen(o.id)}
      className={cn(
        "group grid w-full items-start gap-x-3 gap-y-1.5 px-4 py-3.5 text-left transition-all hover:bg-[#FCF8F9] focus:outline-none focus-visible:bg-[#FCF8F9] sm:px-5 sm:py-4",
        showPrice ? "grid-cols-[48px_minmax(0,1fr)_auto]" : "grid-cols-[48px_minmax(0,1fr)]"
      )}
    >
      <div className="col-start-1 row-span-2 row-start-1 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#EEDFE3] bg-[#FAF0F2] text-[#800020]">
        {o.designImage ? (
          <img src={o.designImage} alt={`${o.garmentDesign} style`} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <ShoppingBag className="h-4 w-4" />
        )}
      </div>
      <div className="col-start-2 row-start-1 min-w-0 self-center truncate font-medium text-[#2F151B]">{o.garmentDesign}</div>
      {showPrice && (
        <div className="col-start-3 row-start-1 self-center text-right text-sm font-semibold tabular-nums text-[#2F151B]">
          {formatCurrency(o.sellingPrice)}
        </div>
      )}
      <div className={cn("col-start-2 row-start-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500", showPrice && "col-span-2")}>
        <StatusBadge status={o.status} />
        <span>Ordered {shortDate(o.orderDate)}</span>
        {o.deliveryDate && <span>Due {shortDate(o.deliveryDate)}</span>}
        {o.assignedStaff && <span className="truncate">{o.assignedStaff.fullName}</span>}
      </div>
    </button>
  );
}

/** General and style notes share one editor; the switch picks which one you are writing. */
function NotesPanel({ customer }: { customer: Customer }) {
  const [field, setField] = useState<"notes" | "styleNotes">("notes");
  return (
    <div>
      <div role="tablist" aria-label="Notes" className="mb-3 inline-flex rounded-lg bg-[#F4ECEE] p-1">
        {([
          ["notes", "General"],
          ["styleNotes", "Style"],
        ] as const).map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={field === k}
            onClick={() => setField(k)}
            className={cn(
              "min-h-9 rounded-md px-4 text-sm font-medium transition",
              field === k ? "bg-white text-[#2F151B] shadow-sm" : "text-stone-500 hover:text-[#2F151B]"
            )}
          >
            {l}
          </button>
        ))}
      </div>
      <NotesCard
        key={field}
        title={field === "notes" ? "General notes" : "Style notes"}
        field={field}
        value={field === "notes" ? customer.notes : customer.styleNotes}
        customerId={customer.id}
      />
    </div>
  );
}

/* ---------- Small presentation helpers ---------- */

function Stars({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${value} of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i < value
              ? "fill-[#800020] text-[#800020]"
              : "fill-stone-200 text-stone-200"
          )}
        />
      ))}
    </span>
  );
}

function ChipList({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  const items = useMemo(
    () =>
      (value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [value]
  );
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400 mb-1.5">
        {label}
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-stone-500">—</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex max-w-full items-center break-words rounded-md bg-[#FAF0F2] border border-[#EEDFE3] px-2 py-1 text-xs text-stone-700"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Inline notes editor with auto-save ---------- */

function NotesCard({
  title,
  field,
  value,
  customerId,
}: {
  title: string;
  field: "notes" | "styleNotes";
  value: string | null | undefined;
  customerId: string;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
    setDirty(false);
  }, [value]);

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      await apiPatch(`/api/customers/${customerId}`, {
        [field]: draft.trim() || null,
      });
      qc.invalidateQueries({ queryKey: ["customer", customerId] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      setDirty(false);
      toast.success(`${title} saved`);
    } catch (err) {
      toast.error("Failed to save notes", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title={title}
      action={
        dirty ? (
          <PremiumButton
            variant="primary"
            size="sm"
            onClick={save}
            loading={saving}
          >
            <Save className="w-3.5 h-3.5" /> Save
          </PremiumButton>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-stone-400">
            <Check className="w-3 h-3" /> Saved
          </span>
        )
      }
    >
      <Textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(true);
        }}
        onBlur={save}
        placeholder={
          field === "styleNotes"
            ? "Capture style preferences, fit notes, do's & don'ts…"
            : "General notes about this customer…"
        }
        rows={6}
        className="rounded-md resize-none"
      />
      <p className="text-[11px] text-stone-400 mt-2 uppercase tracking-[0.15em]">
        Auto-saves on blur
      </p>
    </SectionCard>
  );
}

/* ---------- Edit Personal Dialog (reuses form, prefilled) ---------- */

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  gender: string;
  city: string;
  entrySource: string;
  referredBy: string;
  customerType: string;
  preferredStyles: string;
  notes: string;
}

function buildFormFromCustomer(c: Customer): CustomerForm {
  return {
    name: c.name || "",
    phone: c.phone || "",
    email: c.email || "",
    gender: c.gender || "",
    city: c.city || "",
    entrySource: c.entrySource || "",
    referredBy: c.referredBy || "",
    customerType: c.customerType || "",
    preferredStyles: c.preferredStyles || "",
    notes: c.notes || "",
  };
}

function EditPersonalDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customer: Customer;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CustomerForm>(() =>
    buildFormFromCustomer(customer)
  );
  const [saving, setSaving] = useState(false);

  // Re-sync when the customer changes or the dialog opens.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setForm(buildFormFromCustomer(customer));
  }

  const set = <K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        gender: form.gender || null,
        city: form.city.trim() || null,
        entrySource: form.entrySource || null,
        customerType: form.customerType || null,
        preferredStyles: form.preferredStyles.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (form.entrySource === "Referral") {
        body.referredBy = form.referredBy.trim() || null;
      }
      await apiPatch(`/api/customers/${customer.id}`, body);
      onSaved();
    } catch (err) {
      toast.error("Failed to update customer", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[92dvh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-[#2F151B]">
            Edit Customer
          </DialogTitle>
          <DialogDescription className="text-stone-500">
            Update personal details for {customer.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="e-name" className="text-xs text-stone-600">
              Name <span className="text-[#800020]">*</span>
            </Label>
            <Input
              id="e-name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="h-10 rounded-md"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="e-phone" className="text-xs text-stone-600">
                Phone
              </Label>
              <Input
                id="e-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="h-10 rounded-md"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="e-email" className="text-xs text-stone-600">
                Email
              </Label>
              <Input
                id="e-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="h-10 rounded-md"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-xs text-stone-600">Gender</Label>
              <Select
                value={form.gender || undefined}
                onValueChange={(v) => set("gender", v)}
              >
                <SelectTrigger className="w-full h-10 rounded-md">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="e-city" className="text-xs text-stone-600">
                City
              </Label>
              <Input
                id="e-city"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className="h-10 rounded-md"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-xs text-stone-600">Entry Source</Label>
              <Select
                value={form.entrySource || undefined}
                onValueChange={(v) => set("entrySource", v)}
              >
                <SelectTrigger className="w-full h-10 rounded-md">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {ENTRY_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-stone-600">Customer Type</Label>
              <Select
                value={form.customerType || undefined}
                onValueChange={(v) => set("customerType", v)}
              >
                <SelectTrigger className="w-full h-10 rounded-md">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.entrySource === "Referral" && (
            <div className="grid gap-2 animate-fade-in">
              <Label htmlFor="e-referred" className="text-xs text-stone-600">
                Referred By
              </Label>
              <Input
                id="e-referred"
                value={form.referredBy}
                onChange={(e) => set("referredBy", e.target.value)}
                className="h-10 rounded-md"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="e-styles" className="text-xs text-stone-600">
              Preferred Styles
            </Label>
            <Input
              id="e-styles"
              value={form.preferredStyles}
              onChange={(e) => set("preferredStyles", e.target.value)}
              placeholder="e.g. Classic, Elegant"
              className="h-10 rounded-md"
            />
            <p className="text-xs text-stone-400">
              Comma-separated. Suggestions: {PREFERRED_STYLES.join(", ")}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="e-notes" className="text-xs text-stone-600">
              Notes
            </Label>
            <Textarea
              id="e-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="rounded-md"
            />
          </div>
          <DialogFooter className="gap-2 [&>button]:w-full sm:[&>button]:w-auto">
            <PremiumButton
              type="button"
              variant="outline"
              size="md"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </PremiumButton>
            <PremiumButton
              type="submit"
              variant="primary"
              size="md"
              loading={saving}
            >
              Save Changes
            </PremiumButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Add Measurement Dialog ---------- */

type MeasurementForm = Record<MeasurementKey, string> & { posture: string; notes: string };

const EMPTY_MEAS = {
  ...(Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f.key, ""])) as Record<MeasurementKey, string>),
  posture: "",
  notes: "",
} as MeasurementForm;

function AddMeasurementDialog({
  open,
  onOpenChange,
  customerId,
  customerGender,
  latest,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customerId: string;
  customerGender?: string | null;
  latest?: MeasurementSet;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [unit, setUnit] = useState<MeasureUnit>("cm");
  const [form, setForm] = useState<MeasurementForm>(EMPTY_MEAS);

  const set = (key: keyof MeasurementForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setForm(EMPTY_MEAS);
      setUnit("cm");
    }
    onOpenChange(v);
  };

  /** Start from the previous session so only what changed needs retyping. */
  const copyPrevious = () => {
    if (!latest) return;
    const next = { ...EMPTY_MEAS };
    for (const f of MEASUREMENT_FIELDS) {
      const raw = (latest as unknown as Record<string, number | null | undefined>)[f.key];
      if (raw == null) continue;
      if (f.unitOverride === "kg") next[f.key] = String(raw);
      else {
        const v = fromCm(toCm(raw, latest.unit), unit);
        next[f.key] = v == null ? "" : String(v);
      }
    }
    next.posture = latest.posture ?? "";
    setForm(next);
  };

  /** Switching unit converts what is already typed, so nothing is lost. */
  const switchUnit = (u: MeasureUnit) => {
    if (u === unit) return;
    setForm((prev) => {
      const next = { ...prev };
      for (const f of MEASUREMENT_FIELDS) {
        if (f.unitOverride === "kg" || prev[f.key] === "") continue;
        const cm = inputToCm(prev[f.key], unit);
        const v = fromCm(cm, u);
        next[f.key] = v == null ? "" : String(v);
      }
      return next;
    });
    setUnit(u);
  };

  const toCmValue = (f: (typeof MEASUREMENT_FIELDS)[number]) =>
    f.unitOverride === "kg"
      ? form[f.key] === "" ? null : Number(form[f.key])
      : inputToCm(form[f.key], unit);

  const filled = MEASUREMENT_FIELDS.filter((f) => form[f.key] !== "").length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (filled === 0) {
      toast.error("Enter at least one measurement");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { customerId };
      for (const f of MEASUREMENT_FIELDS) payload[f.key] = toCmValue(f);
      payload.posture = form.posture || null;
      payload.notes = form.notes.trim() || null;
      await apiPost("/api/measurements", payload);
      setForm(EMPTY_MEAS);
      onSaved();
    } catch (err) {
      toast.error("Failed to save measurements", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto rounded-lg p-0 sm:max-w-[720px]">
        <DialogHeader className="border-b border-[#EEDFE3] px-4 py-4 text-left sm:px-6">
          <DialogTitle className="font-display text-xl text-[#2F151B]">New measurement session</DialogTitle>
          <DialogDescription className="text-stone-500">
            ISO 8559-1 body dimensions. Saved in centimetres; enter in whichever unit you are reading off the tape.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEDFE3] bg-[#FAF0F2] px-4 py-3 sm:px-6">
            <div role="group" aria-label="Entry unit" className="inline-flex rounded-md border border-[#EEDFE3] bg-white p-0.5 text-xs">
              {(["cm", "in"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => switchUnit(u)}
                  aria-pressed={unit === u}
                  className={
                    "h-7 min-w-9 rounded px-2.5 font-medium transition-colors " +
                    (unit === u ? "bg-[#2F151B] text-white" : "text-stone-500 hover:text-[#2F151B]")
                  }
                >
                  {u}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="tabular-nums text-stone-500">{filled} of {MEASUREMENT_FIELDS.length} entered</span>
              {latest && (
                <button type="button" onClick={copyPrevious} className="font-medium text-[#800020] hover:underline">
                  Start from previous session
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6 px-4 py-5 sm:px-6">
            {FIELD_GROUPS.map((group) => (
              <fieldset key={group}>
                <legend className="mb-2 w-full border-b border-[#2F151B] pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2F151B]">
                  {group}
                </legend>
                <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
                  {MEASUREMENT_FIELDS.filter((f) => f.group === group).map((f) => {
                    const cm = toCmValue(f);
                    const warn = checkRange(f, cm);
                    const fieldUnit = f.unitOverride ?? unit;
                    return (
                      <div key={f.key}>
                        <Label htmlFor={`m-${f.key}`} className="flex items-baseline justify-between text-xs text-stone-600">
                          <span className={f.core ? "font-medium text-[#2F151B]" : undefined}>{f.label}</span>
                        </Label>
                        <div className="relative mt-1">
                          <Input
                            id={`m-${f.key}`}
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            min="0"
                            value={form[f.key]}
                            onChange={(e) => set(f.key, e.target.value)}
                            aria-describedby={`m-${f.key}-hint`}
                            className={
                              "h-10 rounded-md pr-10 tabular-nums " +
                              (warn ? "border-amber-400 focus-visible:ring-amber-300/40" : "")
                            }
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                            {fieldUnit}
                          </span>
                        </div>
                        <p id={`m-${f.key}-hint`} className={"mt-1 text-xs leading-snug " + (warn ? "text-amber-700" : "text-stone-400")}>
                          {warn ?? f.how}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="m-posture" className="text-xs text-stone-600">Posture</Label>
                <select
                  id="m-posture"
                  value={form.posture}
                  onChange={(e) => set("posture", e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#800020]/20"
                >
                  <option value="">Not noted</option>
                  {POSTURES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="m-notes" className="text-xs text-stone-600">Fitting notes</Label>
                <Textarea
                  id="m-notes"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={2}
                  className="mt-1 rounded-md"
                  placeholder="Shoulder asymmetry, preferred ease, alterations to remember…"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 gap-2 border-t border-[#EEDFE3] bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 [&>button]:w-full sm:[&>button]:w-auto">
            <PremiumButton type="button" variant="outline" size="md" onClick={() => handleOpenChange(false)} disabled={saving}>
              Cancel
            </PremiumButton>
            <PremiumButton type="submit" variant="primary" size="md" loading={saving}>
              Save session
            </PremiumButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
