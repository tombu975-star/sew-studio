# Readability pass (colours + text)

Built on `sewsiness-updated.zip` (the newest Next.js project). Visual only: no logic, routes or data touched.

## What was wrong
- ~220 labels at 10px or smaller and ~150 at 11px, so micro-labels, chips, nav labels and table headings were hard to read.
- Placeholder text (#B1979D) was about 2.6:1 on white.
- On the sign-in page the photo overlay was almost clear (10%) in the middle, exactly where the headline sits.
- A few muted greys and gold-browns on light surfaces sat at 3.5-4.4:1.

## What changed
- Type floor: 8/9/10px classes became 11px, and 11px classes became 12px (`text-xs`) across every screen. Table headings 11.2px -> 12px. Chart axis labels 11px -> 12px.
- Secondary text darkened (stone-400/500/600, muted-foreground, atelier-muted): every level now >= 5:1 on white and on the tinted card surfaces.
- Placeholder #B1979D -> #84696F (about 5:1), fully opaque.
- Sign-in photo scrim strengthened (55/10/75% -> 70/45/80%); footer text darkened.
- Translucent white text on dark surfaces raised to at least 70% opacity (was as low as 40%).
- Landing-page micro-labels, gold-brown text and chart/email muted text darkened to >= 5.4:1.

## Checked, left alone
- Primary button 10.8:1, sidebar text 16.7:1, muted sidebar text 6.8:1, active nav 7.4:1.
- Status badges: text is darkened 22% on its own tint (all >= 5:1).
- Hero scrim on the public page was already strong (97% -> 48%).
