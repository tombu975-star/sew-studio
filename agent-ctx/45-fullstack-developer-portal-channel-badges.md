# Task 45 — Portal channel badges + direction tags

Agent: full-stack-developer (portal channel badges)
Task: Update customer portal (`src/app/portal/PortalClient.tsx`) to show channel badges, direction tags, and recipient on each notification.

## Inputs read
- `worklog.md` — section "CONTRACT FOR MESSAGES + MY-JOBS VIEWS + PORTAL UPDATE" (lines ~1671–1738).
- `src/app/portal/PortalClient.tsx` — the existing premium portal file.
- `src/components/atelier/_portal.tsx` — confirmed `SectionCard` API (title + children).

## Changes made to `src/app/portal/PortalClient.tsx`

1. **Imports**: Added `MessageCircle`, `Smartphone` to the lucide-react import block. Removed the previously unused `Clock` import. (`Mail` and `Bell` were already imported.)

2. **`PortalNotification` interface**: Added optional fields — `direction?: string`, `channel?: string`, `recipient?: string | null`, `deliveryStatus?: string`, `sentAt?: string`.

3. **New helpers** (kept `NOTIF_ICON` intact, added separately as instructed):
   - `CHANNEL_META` map: `whatsapp` → emerald tint + `MessageCircle`; `sms` → sky tint + `Smartphone`; `email` → violet tint + `Mail`; `in_app` → stone tint + `Bell`.
   - `DIRECTION_META` map: `auto` → stone neutral; `manual` → burgundy `#800020` accent.

4. **Section relabel**: `SectionCard` title changed from `"Latest updates"` → `"Messages from the studio"`. Comment header updated accordingly.

5. **Notification row rendering** (per row, in addition to existing icon / time-ago / unread highlighting / title / body / order link):
   - Title row now wraps in a `flex flex-wrap` container so it can hold the title + channel pill + direction pill.
   - **Channel badge** rendered as a small pill (`h-[18px]`, `rounded-full`, `px-1.5`, `text-[9px] uppercase tracking-wide`) with the channel icon + label, colored per `CHANNEL_META`. Only rendered when `n.channel` is set.
   - **Direction tag** rendered as a same-sized pill colored per `DIRECTION_META` (Auto stone / Manual burgundy). Only rendered when `n.direction` is set.
   - **Time-ago** now prefers `n.sentAt` when present, falling back to `n.createdAt`.
   - **Recipient line** added below the body (after the order link): `via WhatsApp · +233 24 112 8845` style — "via {channel.label} · {recipient}". Only shown when `n.recipient` is truthy.

6. **Preserved**: existing per-type main icon (CheckCircle2 / CreditCard / etc.), the burgundy unread highlight (`bg-[#800020]/4 border-[#800020]/15`), unread dot, order link line, hover/transition, `SectionCard` chrome, responsive layout (`max-w-3xl`, `flex-wrap` on the meta row).

## Verification
- `bun run lint 2>&1 | tail -5` → clean (only `$ eslint .`, no errors/warnings).

## Deliverable
- File `src/app/portal/PortalClient.tsx` updated in place. Lint clean.
