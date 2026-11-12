# Sewsiness visual refresh

## What changed
- Reworked the public landing page into a more editorial, premium atelier experience while retaining the Sewsiness burgundy, ivory and gold palette.
- Added a custom responsive product/dashboard preview to the homepage using existing icons and brand styling; no fabricated product screenshots or new dependencies.
- Rebuilt the public header and footer with clearer navigation, stronger calls to action, and improved mobile navigation.
- Refined studio and freelancer login/registration presentation on tablet and desktop while preserving the existing authentication components and state handling.
- Refined the studio app shell with a more deliberate desktop sidebar, active navigation treatment, content canvas and mobile navigation elevation.
- Kept existing website content, product links, contact details, routes, auth flows and database integrations intact.

## Verification
- Source files were updated in place.
- `npm ci --ignore-scripts --no-audit --no-fund` timed out in this environment, so a production build and ESLint run could not be completed here. Run `npm ci`, `npm run lint`, and `npm run build` in a network-enabled environment before deployment.
