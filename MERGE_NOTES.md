# Merge notes

Merged from three uploads:

- `sewsiness-updated.zip` (work2): the Next.js base (privacy and terms pages, site shell, hero image).
- `sewsiness-readability.zip`: the updated project plus a readability pass (text-size floor, contrast, placeholder colour). It is a strict superset of "updated", so it is the base of this merge. A normalised diff showed the only differences were text-size and colour classes.
- `sewsiness-dashboard-cleanup.zip`: the original Base44 (Vite) app. Nothing was copied wholesale; the Webinars page was ported to the Next.js app (see below).

## Added: Webinars & Training
- Menu: `Webinars & Training` (Learning section; owner, trainer, staff and trainee).
- Owner and trainer can schedule, edit, go live, mark done, cancel and delete. Everyone else can view and join.
- Each session has a type (Webinar, Class, Training), a presenter, a date and duration, a live link, a registration or replay link, and an audience (Everyone, Staff, Trainers, Trainees). Sessions are only shown to the audience they are for.
- Links are saved only if they are http(s).
- Plan: included in Enterprise and in the trial. View-only after an unpaid trial, like every other tool.
- Database: `db/migrations/033_webinars_training.sql`.

## Base44 pages not in this app
SOPs, Policies, Stock ledger, Contacts, Assisted calls, Business history, Data handoff, About page.

## Added: free training on the public website (no account needed)
- Website: the "Free training for new fashion graduates" card now links to a new public page, `/training`. Upcoming sessions also appear in a "Coming up" strip on the home page. "Training" in the header and footer goes to `/training`.
- Visitors sign up with name and email (phone and "I am a..." are optional). They get the join link on screen and by email (best effort; needs the email provider to be configured). A signed-up email is only counted once per session.
- Past sessions that have a replay link show "Get the replay".
- Admin: `/admin/trainings` (button "Public trainings" in the admin portal). Create, edit, hide or delete sessions, set places available, see who signed up and download the sign-ups as CSV.
- Safety: join and replay links are never in the public list, only in the sign-up response. Sign-up has a hidden spam field and a per-connection limit. Links must be http(s).
- Database: `db/migrations/034_public_trainings.sql` (two platform-level tables).
- These are separate from the in-app `Webinars & Training` page, which is per studio for its own team and trainees.
