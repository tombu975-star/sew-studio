# Task 20 — full-stack-developer (team view)

## Task
Build the Team view (`src/views/Team.tsx`) — owner-only atelier people management (staff, trainers, freelancers) for the Madam Studio Next.js 16 premium atelier app.

## Work Log
- Read `/home/z/my-project/worklog.md` completely — bound to PREMIUM REDESIGN CONTRACT (burgundy #800020 / cream #faf8f5, surface-premium + elevate-* + lift + animate-fade-in-up) and the CONTRACT FOR TEAM + COMMUNITY VIEWS (exact API shapes, layout, quality bar).
- Inspected premium primitives (`PageHeader`, `SectionCard`, `PremiumMetric`, `AnimatedNumber`, `EmptyState`/`SkeletonList`, `PremiumButton`, `StatusBadge`) and the existing `Customers.tsx`/`CustomerProfile.tsx` for gradient-avatar + premium-tabs patterns.
- Verified backend routes already exist: `GET/POST /api/users`, `GET/POST /api/freelancers`, `PATCH/DELETE /api/freelancers/[id]`. No backend work needed.
- Extended `StatusBadge.tsx` (additive, non-breaking) with three new statuses so the freelancer pill matches the contract colours: `Available`=emerald, `Busy`=amber, `Unavailable`=stone (both `STATUS_STYLES` + `DOT_COLOR` maps).
- Wrote `src/views/Team.tsx` (~970 lines, single `"use client"` default export with inline sub-components):
  - **PageHeader**: eyebrow "Atelier people" (UsersRound icon), title "Team", subtitle, actions slot showing a compact owner chip (gradient avatar initial + "Owner" label + signed-in name) sourced from `useAuth()`.
  - **Premium stat strip** (`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6`): 4 `PremiumMetric` cards — Staff (accent), Trainers (GraduationCap), Freelancers (Briefcase), Available (Sparkles) — each value rendered via `AnimatedNumber` for the count-up effect.
  - **Tabs** (shadcn premium pill style — burgundy active, white surface, scrollable on mobile): "Staff & Trainers" | "Freelancers".
  - **StaffTrainersCard** (`SectionCard` `bodyClassName="p-0"`, header action = PremiumButton "Add Member" with UserPlus icon): `divide-y` list sorted by role hierarchy (madam→staff→trainer→trainee) then name. Each row: burgundy gradient avatar (initial), fullName (font-medium), role `StatusBadge`, email/phone subtext with Mail/Phone icons, gender chip. The owner (role=madam) row gets a burgundy "Owner" tag (Crown icon) + "Permanent" label and is non-deletable. The signed-in owner's own row also gets a "You" chip.
  - **FreelancersCard** (`SectionCard` `bodyClassName="p-0"`, header action = PremiumButton "Add Freelancer" with Plus icon): `divide-y` list. Each row: burgundy gradient avatar with specialty icon (Beader=Sparkles, Embroiderer=Flower2, Cutter=Scissors, Tailor=Shirt, Designer=PenTool, Photographer=Camera, Other=Briefcase), name, burgundy specialty chip, italic skills, phone/email subtext, rate (`formatCurrency` + `tabular-nums`) with "per piece" hint, `StatusBadge` (emerald/amber/stone), compact status-change `Select` (PATCH on change with toast), ghost-icon delete button (Trash2) opening an `AlertDialog` confirm → DELETE.
  - **AddMemberDialog**: Full Name (required), Email (required), Role `Select` (Staff/Trainer/Trainee — madam not offered), Gender `Select` (Female/Male/Other/Prefer not to say), Phone, Password (prefilled "atelier2025" + hint). PremiumButton "Add member" (loading). `useMutation` POST /api/users → invalidate `['users']` + success toast; `onError` detects 409 (email exists) and shows a specific error toast.
  - **AddFreelancerDialog**: Name (required), Specialty `Select`, Skills (text), Phone, Email, Rate (number, tabular-nums), Status `Select`, Notes (`Textarea`). PremiumButton "Add freelancer" (loading). POST /api/freelancers → invalidate `['freelancers']` + toast.
  - Loading: `SkeletonList` (4 rows) in each tab. Empty: `EmptyState` with UsersRound icon + contextual copy + add CTA.
  - `Field` helper renders a consistent uppercase-tracked label with burgundy required asterisk.
- Fixed icon import: `Worker` is not exported by lucide-react — swapped to `Briefcase` for both the "Other" specialty avatar and the Freelancers metric.
- Verified: `bun run lint` clean (no errors); `bunx tsc --noEmit` clean for my files; dev log shows successful recompile (`✓ Compiled in 9.9s`, `GET / 200`) after file creation. The remaining `Module not found: '@/views/Community'` error in dev.log belongs to the separate Task 21 (Community view) — not in scope here.

## Stage Summary
- Files created/modified:
  - `src/views/Team.tsx` — premium owner-only people management view (default export `Team`, `"use client"`).
  - `src/components/atelier/StatusBadge.tsx` — additive extension with `Available`/`Busy`/`Unavailable` statuses (emerald/amber/stone) so freelancer pills match the contract.
- Features delivered: premium stat strip with AnimatedNumber counts, burgundy pill tabs, gradient-avatar roster (owner marked + non-deletable), gradient-avatar freelancer list with per-specialty icons + rate + status badge + inline status-change Select + AlertDialog-confirmed delete, two full premium dialogs (Add Member with 409 handling, Add Freelancer), SkeletonList loaders, EmptyState empties, sonner toasts on every mutation, fully responsive (tabs scroll, rows stack on mobile, dialogs max-w-lg), burgundy #800020 primary throughout, tabular-nums on rates, animate-fade-in-up on PageHeader.
- Consumes: `@/components/atelier/{PageHeader, SectionCard, PremiumMetric, AnimatedNumber, EmptyState, SkeletonList, PremiumButton, StatusBadge}`, `@/components/ui/{Tabs, Dialog, AlertDialog, Input, Label, Textarea, Select}`, `@/lib/api` (apiGet/apiPost/apiPatch/apiDelete), `@/lib/format` (formatCurrency), `@/lib/types` (User, Freelancer), `@/stores/auth` (useAuth), `@tanstack/react-query` (useQuery + useMutation + invalidate), `sonner` (toast), `lucide-react`.
