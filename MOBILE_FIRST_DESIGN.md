# Sewiness mobile-first design notes

Sewiness is designed primarily for phones and tablets. The application shell follows these rules:

- Phones and tablets below 1024px use the sticky top bar, role-aware bottom navigation, and the More bottom sheet.
- Desktop layouts from 1024px use the full sectioned sidebar.
- The bottom navigation remains available on tablet portrait and tablet landscape widths below the desktop breakpoint.
- The top bar includes the Sewiness brand mark and a 44px profile touch target.
- The PWA manifest does not lock the app to portrait, so tablets can be used in either orientation.
- Existing page components, role permissions, APIs, database schema, migrations, and business workflows are retained.

## Brand

The project source logo uses the burgundy-and-gold Sewiness identity. The app keeps that identity rather than introducing a conflicting purple palette.

## Responsive breakpoints

The app shell uses Tailwind's `lg` breakpoint (1024px) to switch from touch-first navigation to the desktop sidebar. Page-level `sm` and `md` breakpoints remain in place for responsive forms, cards, and content grids.
