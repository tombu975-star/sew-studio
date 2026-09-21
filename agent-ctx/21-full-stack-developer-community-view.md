# Task 21 — full-stack-developer (community view)

## Task
Build Community view (studio internal wall/feed) for the Madam Studio atelier app — `src/views/Community.tsx`.

## Context reviewed
- `/home/z/my-project/worklog.md` (complete) — bound to the PREMIUM REDESIGN CONTRACT + the CONTRACT FOR TEAM + COMMUNITY VIEWS:
  - Burgundy #800020 / cream #faf8f5 tokens; no blue/indigo as primary.
  - Premium primitives: PageHeader, SectionCard, PremiumButton, EmptyState, SkeletonCard from `@/components/atelier/*`.
  - shadcn Input/Label/Textarea/Select(+parts).
  - TanStack Query (`useQuery` key `['community']` + `useMutation` with invalidate).
  - `apiGet, apiPost` from `@/lib/api`; `toast` from sonner; `useAuth` from `@/stores/auth`.
  - `CommunityPost, CommunityComment, CommunityPostType` types from `@/lib/types`.
- Inspected existing primitives (PageHeader, SectionCard, PremiumButton, EmptyState/SkeletonCard) + shadcn Input/Label/Textarea/Select for exact prop shapes.
- Confirmed backend already exists (built in Task 19): GET/POST `/api/community`, POST `/api/community/[id]/like`, POST `/api/community/[id]/comments`.
- Confirmed `page.tsx` already routes `case "community": return <Community />` via dynamic import.

## File delivered
`src/views/Community.tsx` — single `"use client"` default export `Community` + inline `PostCard` sub-component (~580 lines).

## Features
- **PageHeader**: eyebrow "Studio wall" + MessageSquare icon, title "Community", subtitle, burgundy MessageSquare accent badge.
- **Composer** (SectionCard "Share something", `lg:sticky lg:top-6 z-10`, animate-fade-in-up):
  - Row 1: type Select (Update/Question/Inspiration/Showcase; Announcement gated to `user.role === "madam"`) + optional title Input.
  - Row 2: full-width body Textarea (3 rows).
  - Footer: char counter `{body.length}/500` (turns burgundy when over limit) + Post PremiumButton (primary, Send icon, loading, disabled when body empty or over limit).
  - Submit → POST `/api/community` with `authorId/authorName/authorRole/type/title/body` → invalidate `['community']` + toast "Posted to the wall." + clear form.
- **Filter pills** (flex flex-wrap, animate-fade-in-up): All / Updates / Questions / Inspiration / Showcases / Announcements. Active = burgundy bg + white text + elevate-burgundy; inactive = white bg + stone text + #E7E5E4 border + hover lift. Client-side filter; pinned posts always surface first.
- **Feed**: list of `PostCard` articles, each `surface-premium border border-[#E7E5E4] rounded-xl elevate-sm lift animate-fade-in-up overflow-hidden` with staggered `animationDelay: idx*60ms` (capped at 8).
  - Header row: gradient avatar (initial, `from-[#800020] to-[#6b0018]`) + authorName + role chip (madam=burgundy "Owner", staff=stone "Staff", trainer=amber "Trainer", trainee=sky "Trainee") + time-ago. Right: type chip (announcement=burgundy, showcase=emerald, question=sky, inspiration=amber, update=stone) with type icon + amber Pin badge if pinned.
  - Body: optional title (font-display text-lg) + body text (`whitespace-pre-wrap`).
  - Image (if imageUrl): rounded-lg frame, aspect-video, object-cover, shadow-inner, bg-[#FBF9F7].
  - Actions row: Like button (Heart icon, fills burgundy when liked, count badge with tabular-nums) + Comment button (MessageSquare icon + count, toggles comment panel).
  - Comments section (tinted bg, hairline border-top): existing comments list (small gradient avatar dot + authorName + time-ago + body) + comment input (Input + Send PremiumButton sm with loading). Enter submits, Shift+Enter for newline.
- **Like behavior**: optimistic cache mutation via TanStack `onMutate` (snapshot prev, update `_count.likes ±1`, toggle local set), rollback on error, sync with response on success, invalidate on settle. Liked postIds persisted per-user in `localStorage` (`ms_community_liked_{userId}`) so the heart stays filled across sessions (API doesn't expose `likedByMe`). Toast "Liked." on like.
- **States**: loading = 4 SkeletonCards; error = SectionCard + EmptyState + Retry PremiumButton outline; empty = SectionCard + EmptyState "No posts yet" with helpful description.
- **Time-ago helper** defined inline exactly per spec (just now / Xm ago / Xh ago / Xd ago / fallback locale date "12 Mar").
- **Quality bar**: SectionCard + PremiumButton everywhere; elevate-sm + lift on feed cards; gradient burgundy avatars; burgundy Heart fill on liked; animate-fade-in-up on PageHeader (built-in) + composer + filter row + staggered feed cards; sonner toasts for all mutations; SkeletonCard loaders; EmptyState for empties + errors; responsive (composer grid collapses to single column on mobile, filter pills wrap, feed cards full-width); tabular-nums on all counts.
- **Accessibility**: aria-pressed on toggle buttons (like, comment, filter pills), aria-labels on icon-only actions, semantic `<article>` + `<ul>/<li>` for comments, hidden decorative avatars (aria-hidden).

## Verification
- `bun run lint` → 0 errors, 0 warnings project-wide.
- `bunx tsc --noEmit --skipLibCheck` → 0 errors in `src/views/Community.tsx` (remaining TS errors are in `prisma/seed.ts` + `examples/websocket/*` + `upload/extracted/*` legacy files — not mine).
- Dev server compiled successfully after save (`✓ Compiled in 9.9s`, `GET / 200`).

## Backend dependency (already implemented in Task 19)
- `GET /api/community` → `CommunityPost[]` (each with `comments[]` + `_count.likes`, ordered pinned-then-recent).
- `POST /api/community` body `{ authorId, authorName, authorRole, type, title?, body, imageUrl? }` → `CommunityPost`.
- `POST /api/community/[id]/like` body `{ authorId }` → `{ liked: boolean }` (toggle).
- `POST /api/community/[id]/comments` body `{ authorId, authorName, body }` → `CommunityComment`.

## Consumes
- `@/components/atelier/{PageHeader, SectionCard, PremiumButton, EmptyState, SkeletonCard}`
- `@/components/ui/{Input, Label, Textarea, Select+parts}`
- `@/lib/api` (`apiGet, apiPost`), `@/lib/utils` (`cn`), `@/lib/types` (`CommunityPost, CommunityComment, CommunityPostType`)
- `@/stores/auth` (`useAuth`)
- `@tanstack/react-query` (`useQuery, useMutation, useQueryClient`)
- `sonner` (`toast`)
- `lucide-react` (`MessageSquare, Send, Heart, Pin, Sparkles, HelpCircle, Lightbulb, Image as ImageIcon, Megaphone`)
