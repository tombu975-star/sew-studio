# Sewsiness Academy

Free training that runs entirely on this platform: video courses, quizzes, certificates and live classes.
No Zoom, Meet, YouTube, Vimeo or course service is used. Files are stored and streamed by this app.

## What visitors get
- `/academy`: course catalogue, live classes, "continue where you left off" for returning learners.
- `/academy/<course>`: course page. `/academy/learn/<course>`: lesson player.
- Video player: play/pause, seek, speed, captions, full screen, resume from where you stopped,
  keyboard shortcuts (Space or K, J and L for 10 seconds, M, C, F). Works with Range streaming, so seeking is instant.
- Quizzes are marked on the server. Correct answers are never sent to the browser before submitting.
- Finishing every lesson issues a certificate (PDF) with a number like `SEW-ABCD-EFGH`.
  Anyone can check it at `/academy/verify`.
- `/academy/me`: courses, progress, certificates, learning streak.
- Sign-in is an emailed 6-digit code (or one-tap link). No password.
- `/academy/live/<id>`: live class room with class chat, a Questions tab, countdown and calendar download.
- `/training` now redirects to `/academy#live`.

## Setup (once)
1. **Deploy.** The migration `db/migrations/036_academy.sql` runs by itself in the Railway pre-deploy step.
2. **Add a Volume** to the Railway service (for example mounted at `/data`) and set
   `MEDIA_DIR=/data/media`. Without a volume, uploaded videos are lost on every redeploy.
3. **Email must be configured** (Resend, SMTP or Apps Script; see `src/lib/mailer.ts`). Learners sign in with an
   emailed code, so no email provider means nobody can sign in.
4. Set `NEXT_PUBLIC_APP_URL` to your public address so the sign-in links in emails are correct.
5. Open `/admin/academy` (platform admin) and create the first course.

## Adding a course
`/admin/academy` > Courses > New course. Add lessons (video, reading or quiz), mark one lesson as a free preview
if you want visitors to try it, then **Publish**. Upload is in 4 MB pieces and resumes by itself if the connection drops.
You can reorder lessons, attach `.vtt` captions and upload a cover picture.

### Preparing a video (recommended for phone data)
```
ffmpeg -i input.mov -vf scale=-2:720 -c:v libx264 -crf 25 -preset slow \
       -c:a aac -b:a 96k -movflags +faststart lesson.mp4
```
`+faststart` lets playback begin before the whole file has downloaded. Accepted types: MP4, WebM (video, up to 2 GB), VTT (captions),
JPG/PNG/WebP (covers). The first bytes of every upload are checked, so a renamed file is rejected.

## Live classes: how they work, and what they are not
Create the session on `/admin/trainings` as before. On `/admin/academy` > **Live classroom**, set Delivery to
**On Sewsiness** and attach the session video.
- Before the start time: countdown. At the start time the class opens by itself for everyone.
- During the class everyone watches the same point in the video, can rewind but cannot skip ahead, and uses the chat.
  Learners can mark a message as a question. Open the room as the signed-in platform admin to pin, answer or hide messages and reply as host.
- Afterwards the same video is the replay.

**Honest limit:** this is a scheduled premiere with live chat, not a two-way camera call. A browser cannot broadcast live video
to many viewers without a media server, and a media server is a separate piece of infrastructure. If you later want a presenter on live camera,
the clean way is a self-hosted open-source media server (for example LiveKit) on your own host, plugged into the same room page.
Sessions can still use an outside link: set Delivery to "Outside link".

## Security notes
- Course videos need a signed-in learner (except lessons marked free preview). File ids alone are not enough; access is checked on every request.
- Sign-in codes: 15 minutes, 5 wrong tries, stored hashed; sessions are hashed in the database; cookies are HttpOnly.
- The sign-in request answers the same whether or not the email is known.
- Chat is rate limited. Admin routes require the platform admin session.
- Uploads: type decided by extension on the server, magic bytes checked, size limits per type, files stored under random names.

## Testing
`tests/academy-e2e.py` runs 58 checks against a running app and Postgres (uploads, ranges, sign-in, quizzes, certificates, live chat, permissions).

## Not included (good next steps)
- Adaptive streaming (HLS) and automatic video compression: needs ffmpeg on the server.
- Paid courses or per-course access rules (everything is free today).
- Certificate QR code.
