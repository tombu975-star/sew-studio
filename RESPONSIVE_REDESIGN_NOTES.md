# Sewsiness responsive redesign handoff

## Responsive behavior
- Phone widths (under 640px): compact studio content gutters, two-column metric tiles, thumb-sized controls, safe-area-aware bottom navigation, scrollable data tables, and viewport-constrained dialogs.
- Tablet widths (640px–1023px): touch-first app navigation, wider content gutters, two-column KPI layouts, and full-width content canvases without fixed-width form overflow.
- Desktop widths (1024px+): sectioned studio sidebar and spacious content widths.
- Admin portal: mobile drawer navigation, compact headers and responsive content gutters/cards.
- Public website and authentication pages keep their own editorial typography and split-login layout; studio-only mobile type overrides are scoped to `.studio-shell`.

## Brand and imagery
- Retains Sewsiness burgundy, ivory and gold brand palette.
- Updated `public/atelier-login.jpg` with the newly generated 16:9 atelier hero photograph, used by the public homepage and authentication split panel.

## Preserved behavior
- Existing route structure, authentication components, API handlers, database integrations, roles, permissions, and workflows remain in place.
- CSS-only responsive adjustments avoid changing business logic.

## Verification
- `npm run build` could not run in this environment because the supplied `node_modules` directory is incomplete (`next` executable/package is missing).
- Run `npm ci`, `npm run lint`, and `npm run build` in a network-enabled environment, then verify at 360px, 390px, 768px, 820px, 1024px and 1440px widths before deployment.
