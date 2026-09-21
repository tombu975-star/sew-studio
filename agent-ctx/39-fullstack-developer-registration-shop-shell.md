# Task 39 — Registration UI + Shop name in AppShell

**Agent:** full-stack-developer (registration UI + shop in shell)
**Task ID:** 39
**Scope:** Build the new-shop registration flow in `LoginPage.tsx` and surface the real tenant shop name in `AppShell.tsx` for the multi-tenant "Madam Studio" atelier.

---

## Contracts bound
- **PREMIUM REDESIGN CONTRACT** (worklog.md ~L291): burgundy `#800020` / cream `#faf8f5`, `surface-premium` + `elevate-sm/burgundy` + `lift` + `animate-fade-in-up`, premium primitives (`PageHeader`, `SectionCard`, `PremiumButton`, `EmptyState`, etc.), `tabular-nums`, sonner toasts.
- **CONTRACT FOR TENANT SCOPING + REGISTRATION UI + DEPLOYMENT** (worklog.md ~L1449): `useAuth().register({ shopName, fullName, email, password, gender? })` creates a Shop + owner User (madam) and sets session; `user.shop = { id, name, slug, currency }`; `POST /api/auth/register` already built and returns **409** on duplicate email.

## Files edited

### 1. `src/components/atelier/LoginPage.tsx` (rewritten)
- Kept the existing mobile-first hero band (burgundy gradient + grain + Scissors badge + fade-into-form) untouched.
- Added a **mode toggle pill** at the top of the form section: two buttons ("Sign in" with `Lock` icon, "New shop" with `Store` icon). Active state = burgundy `elevate-burgundy`; inactive = stone text on hover-cream.
- **Sign-in form remains DEFAULT** (heading "Welcome back", subtitle "Sign in to your studio to continue."). Existing email/password inputs + show/hide password preserved; switched the submit button to `PremiumButton` (size lg, loading state) for consistency.
- **Register form** switches in with `key={mode}` + `animate-fade-in-up` (re-fires on every toggle). Heading "Create your shop", subtitle "Open a new atelier — your studio, your clients, your craft." Fields:
  - **Shop name*** (Store icon, placeholder "Esi Atelier", autoComplete="organization")
  - **Your name*** (User icon, placeholder "Esi Mensah", autoComplete="name")
  - **Email*** (Mail icon, autoComplete="email")
  - **Password*** (Lock icon + Eye/EyeOff toggle, `minLength={6}`, autoComplete="new-password", label includes "· min 6 chars" hint)
  - **Gender** (shadcn `Select` with `SelectTrigger`/`SelectContent`/`SelectItem` for Female / Male / Other; trigger styled `h-12 rounded-xl elevate-sm` to match the inputs; helper caption "Used to address you as Madam / Master throughout the studio.")
- Submit handlers:
  - `submitLogin` → `useAuth().login(email, password)` → `toast.success(\`Welcome back, ${first name}.\`)`
  - `submitRegister` validates `password.length >= 6` + required fields inline (toast + inline burgundy error box) → `useAuth().register({ shopName, fullName, email, password, gender })` → on success `toast.success(\`Welcome to ${user.shop?.name || shopName}!!\`)`. Auth status flips to `authenticated`, so the app gate routes to the dashboard.
- **Error extraction**: new `extractApiError(err, fallback)` helper parses the JSON `{error:"…"}` payload out of `api.ts`'s `"409 Conflict — {…}"` error string. So a duplicate-email 409 surfaces the clean "An account with that email already exists." text both inline and as a toast.
- `PremiumButton` (size lg, loading) used for both submits — it renders its own `Loader2` spinner when loading; children switch between label+ArrowRight and "Signing in…" / "Creating your shop…". `ArrowRight` uses `group-hover:translate-x-0.5` for the signature micro-animation.
- Tertiary text links below each form switch modes: sign-in shows "Opening a new atelier? **Create a shop** →" (Store + ArrowRight), register shows "← Already have a studio? **Back to sign in**" (ArrowLeft).
- Subtle footer "Madam Studio — where every stitch tells a story." retained.

### 2. `src/components/atelier/AppShell.tsx` (additive)
- Added `const shopDisplayName = user?.shop?.name || studioName;` — real tenant shop name with role-store fallback during hydration. (The auth store already calls `roleStore.setStudioName(user.shop.name)` on login, so the two agree post-hydrate.)
- **Mobile top bar**: replaced `studioName.split(" ")[0]` with the **full** `shopDisplayName` in a `truncate max-w-[180px]` span (with `title` attribute for hover tooltip). Button got `min-w-0` and the logo wrapper got `shrink-0` so `truncate` actually works inside the flex row.
- **Desktop rail**: restructured the `h-20` logo button into a `flex flex-col` wrapper containing the Scissors logo button + a tiny `text-[8.5px] uppercase tracking-[0.14em] text-stone-400 font-semibold truncate max-w-[72px]` label showing `shopDisplayName.split(" ")[0]` (first word — the rail is only 80px wide). Full name in `title` tooltip.

## Verification
- `bun run lint` → **clean** (no errors).
- `npx tsc --noEmit` → no errors for `LoginPage.tsx` or `AppShell.tsx` (only pre-existing errors in `examples/websocket/*` + `prisma/seed.ts`, both out of scope).
- Dev log: recompiled successfully (`✓ Compiled in 8.3s`).
- `POST /api/auth/register 200` already visible in dev log → backend confirmed working.

## Consumes
- `useAuth` (login, register, hydrate, status, user) from `@/stores/auth`
- `toast` from `sonner`
- `cn` from `@/lib/utils`
- `PremiumButton` from `@/components/atelier/PremiumButton`
- shadcn `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` from `@/components/ui/select`
- lucide-react: `Scissors`, `Mail`, `Lock`, `ArrowRight`, `Eye`, `EyeOff`, `Store`, `User as UserIcon`, `ArrowLeft`

## Notes for downstream agents
- `extractApiError(err, fallback)` is a local helper inside `LoginPage.tsx`. If other views need clean error messages from `apiPost`/`apiPatch`/`apiDelete`, consider promoting it to `@/lib/api.ts` as a shared util.
- The role store's `studioName` is now sourced from the tenant shop on login (see `syncRoleStore` in `src/stores/auth.ts`). Anywhere still reading `useRole().studioName` will see the real shop name after auth hydrate; before hydrate it falls back to the default `"Madam Studio"`.
