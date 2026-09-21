# Task ID: 6 — Style Assist View

## Agent
full-stack-developer (style-assist)

## Task
Build the AI-powered Style Assist view (`src/views/StyleAssist.tsx`) for the Madam Studio atelier app — Next.js 16 App Router, client component.

## Work Log

1. Read `/home/z/my-project/worklog.md` to understand the binding design system, API contract, and shared imports.
2. Explored project structure: confirmed `AtelierCard`, `StatusBadge`, shadcn UI components (Button, Input, Label, Textarea, Separator, Select), `useNav` store, `apiGet/apiPost/apiPatch` helpers, and domain types in `@/lib/types`.
3. Reviewed the original Vite source (`upload/extracted/src/pages/StyleAssist.jsx` and its sub-components) for behavior reference; rewrote everything to fit the Next.js contract.
4. Created `src/views/StyleAssist.tsx` (~1315 lines, single self-contained `"use client"` file):
   - **CustomerPicker** — centered AtelierCard "Choose a client to design for" with a Select of all customers from `GET /api/customers`. On pick → `go('style-assist', { id })`.
   - **StyleAssistForCustomer** — main view. Loads customer detail via `useQuery` on `/api/customers/[id]`. Renders back-link, Sparkles + "Style Assist" header, and the 1/3 + 2/3 grid layout.
   - **CustomerStyleSummary** (left 1/3) — AtelierCard titled "{name} — Style Profile": preferred style chips, favourite colours, colours-to-avoid (orange chips), favourite fabrics, preferred fit, design preferences, style notes; latest measurement set (bust/waist/hip from MeasurementSet + height from Customer.height); previous orders count + 5 most recent with status badges; recent feedback with star ratings; data confidence indicator (Limited/Good/Complete dot + note) only after first generation.
   - **DesignRequestForm** (top of right 2/3) — AtelierCard titled "Design Request": Garment Type (required Input), Occasion, Desired Look, Season Select (Dry Season, Harmattan, Raining Season, Festive, Year-round), Budget (GHS number), Fabric Available, Colour Preference, Designer Direction Textarea, Generate Concepts button (burgundy, Sparkles icon, spinner + "Designing…" while generating).
   - **ConceptCard** (inline) — each generated or saved concept:
     - Header: conceptName (font-display text-lg) + "% match" burgundy-tinted pill + status badge (if saved).
     - Image area: `aspect-[3/4]` frame with the rendered image, or a prominent "Visualize Concept" placeholder button (Wand2 icon, hover animation, loading state).
     - Specs grid: silhouette, neckline, sleeve, length, fabric, colour, detailing, embellishment — 2 cols mobile / 3 cols sm+.
     - "Why this may work" tinted box (`bg-[#FBF9F7] border-l-2 border-[#800020]/30 pl-3`).
     - Fit considerations + design direction paragraphs.
     - Actions row: Approve (emerald) + Reject (outline) + Convert to Order (burgundy) for drafts; Convert to Order + Visualize (if Approved, no image) for saved concepts. Reject opens an inline reason picker with chips + freeform textarea.
   - **ConceptSkeleton** — pulse-animated skeleton cards shown while generating.
5. Data flow:
   - `handleGenerate` → POST `/api/style-assist/generate` `{ customerId, request }` → set drafts + dataConfidence/confidenceNote. Toast on error.
   - `handleVisualize` → POST `/api/style-assist/visualize` `{ concept }` → `{ imageUrl }`. If saved concept: PATCH `/api/style-concepts/[id]` `{ imageUrl }` + refetch. If draft: update local drafts state. Loading state per concept (keyed by id or tempId).
   - `handleApprove` / `handleReject` → POST `/api/style-concepts` with all concept + request fields + status + dataConfidence (+ rejectionReason for rejects) → remove from drafts + refetch customer detail.
   - `handleConvert` → `go('new-order', { params: { customerId, garment: conceptName — silhouette — fabric — colour } })`.
6. Empty state, error toast, loading skeletons, and a graceful "Could not load customer" retry card all implemented.
7. Responsive: grid collapses to single column on mobile; specs grid is 2 cols on mobile, 3 on sm+; form is 1 col mobile, 2 cols sm+.
8. Verified lint: zero warnings/errors in StyleAssist.tsx (warnings remain only in `upload/extracted/` original Vite source and other agents' files). Verified tsc: zero TS errors in StyleAssist.tsx.

## Stage Summary
- **File**: `src/views/StyleAssist.tsx` — single self-contained client component with inline sub-components (CustomerPicker, StyleAssistForCustomer, CustomerStyleSummary, DesignRequestForm, ConceptCard, ConceptSkeleton).
- **Features**: customer picker → AI design request form → AI concept generation → per-concept AI image visualization → approve/reject with reason → save → convert to order → saved-concepts gallery. Polished editorial aesthetic (burgundy `#800020` primary, cream `#FBF9F7`, `rounded-sm`, Cormorant display font). Loading skeletons, error toasts, empty state, full responsiveness.
- **AI integration**: calls `POST /api/style-assist/generate` for concept drafts (returns dataConfidence, confidenceNote, concepts[]), and `POST /api/style-assist/visualize` for per-concept AI image rendering. Saved via `POST /api/style-concepts` and patched via `PATCH /api/style-concepts/[id]` (imageUrl). All AI endpoints are still TBD by backend agents — the view degrades gracefully with toast errors until they exist.
