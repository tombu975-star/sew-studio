import { randomBytes } from "node:crypto";
import { getPool } from "@/lib/db/pool";
import { parseQuiz, publicQuiz } from "./quiz";

export type CourseCard = {
  id: string; slug: string; title: string; subtitle: string; level: string; category: string; accent: string;
  coverMediaId: string | null; lessonCount: number; minutes: number; learners: number;
};
export type LessonRow = {
  id: string; section: string; position: number; title: string; kind: "video" | "reading" | "quiz"; summary: string;
  durationSeconds: number; isPreview: boolean; mediaId: string | null; captionsMediaId: string | null;
};
export type CourseDetail = CourseCard & { description: string; passMark: number; certificateEnabled: boolean; lessons: LessonRow[] };

const CARD = `c.id, c.slug, c.title, coalesce(c.subtitle, '') as subtitle, c.level, coalesce(c.category, '') as category, c.accent,
  c.cover_media_id as "coverMediaId",
  (select count(*)::int from public.academy_lessons l where l.course_id = c.id) as "lessonCount",
  (select coalesce(sum(case when l.duration_seconds > 0 then l.duration_seconds else 300 end), 0)::int / 60 from public.academy_lessons l where l.course_id = c.id) as minutes,
  (select count(*)::int from public.academy_enrollments e where e.course_id = c.id) as learners`;

export async function listPublishedCourses(limit = 50): Promise<CourseCard[]> {
  try {
    const { rows } = await getPool().query(
      `select ${CARD} from public.academy_courses c where c.published order by c.sort_order, c.created_at desc limit $1`, [limit]);
    return rows;
  } catch (e) { console.error("[academy] could not list courses", e); return []; }
}

export async function getCourse(slug: string): Promise<CourseDetail | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select ${CARD}, coalesce(c.description, '') as description, c.pass_mark as "passMark", c.certificate_enabled as "certificateEnabled"
       from public.academy_courses c where lower(c.slug) = lower($1) and c.published`, [slug]);
  if (!rows[0]) return null;
  const lessons = await pool.query(
    `select id, section, position, title, kind, coalesce(summary, '') as summary, duration_seconds as "durationSeconds",
            is_preview as "isPreview", media_id as "mediaId", captions_media_id as "captionsMediaId"
       from public.academy_lessons where course_id = $1 order by position, created_at`, [rows[0].id]);
  return { ...rows[0], lessons: lessons.rows };
}

export async function getLesson(courseId: string, lessonId: string) {
  const { rows } = await getPool().query(
    `select id, section, title, kind, coalesce(summary, '') as summary, coalesce(body, '') as body, media_id as "mediaId",
            captions_media_id as "captionsMediaId", duration_seconds as "durationSeconds", is_preview as "isPreview", quiz
       from public.academy_lessons where id = $1 and course_id = $2`, [lessonId, courseId]);
  const r = rows[0];
  if (!r) return null;
  const quiz = r.quiz ? parseQuiz(r.quiz) : null;
  return { ...r, quiz: quiz ? publicQuiz(quiz) : null };
}

export type ProgressMap = Record<string, { position: number; completed: boolean }>;

export async function getProgress(learnerId: string, courseId: string): Promise<ProgressMap> {
  const { rows } = await getPool().query(
    `select p.lesson_id, p.position_seconds, p.completed_at is not null as completed
       from public.academy_progress p join public.academy_lessons l on l.id = p.lesson_id
      where p.learner_id = $1 and l.course_id = $2`, [learnerId, courseId]);
  return Object.fromEntries(rows.map((r) => [r.lesson_id, { position: r.position_seconds, completed: r.completed }]));
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => { const b = randomBytes(8); const s = Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join(""); return `SEW-${s.slice(0, 4)}-${s.slice(4)}`; };

/** After a lesson is finished: enrol, and when every lesson is done, mark the course complete and issue a certificate. */
export async function afterLessonComplete(learnerId: string, courseId: string) {
  const pool = getPool();
  await pool.query(`insert into public.academy_enrollments (learner_id, course_id) values ($1, $2) on conflict do nothing`, [learnerId, courseId]);
  const { rows } = await pool.query(
    `select (select count(*)::int from public.academy_lessons where course_id = $2) as total,
            (select count(*)::int from public.academy_progress p join public.academy_lessons l on l.id = p.lesson_id
              where p.learner_id = $1 and l.course_id = $2 and p.completed_at is not null) as done`, [learnerId, courseId]);
  const { total, done } = rows[0];
  if (total === 0 || done < total) return { courseCompleted: false, certificate: null as string | null };
  await pool.query(`update public.academy_enrollments set completed_at = coalesce(completed_at, now()) where learner_id = $1 and course_id = $2`, [learnerId, courseId]);
  const course = (await pool.query("select title, certificate_enabled from public.academy_courses where id = $1", [courseId])).rows[0];
  if (!course?.certificate_enabled) return { courseCompleted: true, certificate: null };
  const existing = await pool.query("select code from public.academy_certificates where learner_id = $1 and course_id = $2", [learnerId, courseId]);
  if (existing.rows[0]) return { courseCompleted: true, certificate: existing.rows[0].code as string };
  const learner = (await pool.query("select full_name from public.academy_learners where id = $1", [learnerId])).rows[0];
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    const ins = await pool.query(
      `insert into public.academy_certificates (code, learner_id, course_id, learner_name, course_title) values ($1, $2, $3, $4, $5)
       on conflict do nothing returning code`, [code, learnerId, courseId, learner.full_name, course.title]);
    if (ins.rows[0]) return { courseCompleted: true, certificate: code };
    const again = await pool.query("select code from public.academy_certificates where learner_id = $1 and course_id = $2", [learnerId, courseId]);
    if (again.rows[0]) return { courseCompleted: true, certificate: again.rows[0].code as string };
  }
  return { courseCompleted: true, certificate: null };
}

/** Consecutive days (ending today or yesterday) on which the learner did any learning. */
export async function learningStreak(learnerId: string): Promise<number> {
  const { rows } = await getPool().query(
    `select distinct (updated_at at time zone 'UTC')::date as d from public.academy_progress where learner_id = $1 order by d desc limit 60`, [learnerId]);
  if (!rows.length) return 0;
  const day = (d: Date) => Math.floor(d.getTime() / 86400000);
  const today = day(new Date());
  let expected = day(rows[0].d);
  if (today - expected > 1) return 0;
  let streak = 0;
  for (const r of rows) { if (day(r.d) === expected) { streak++; expected--; } else break; }
  return streak;
}

export async function getLearnerDashboard(learnerId: string) {
  const pool = getPool();
  const courses = await pool.query(
    `select ${CARD}, e.enrolled_at as "enrolledAt", e.completed_at as "completedAt",
       (select count(*)::int from public.academy_progress p join public.academy_lessons l on l.id = p.lesson_id
         where p.learner_id = $1 and l.course_id = c.id and p.completed_at is not null) as done,
       (select l.id from public.academy_progress p join public.academy_lessons l on l.id = p.lesson_id
         where p.learner_id = $1 and l.course_id = c.id order by p.updated_at desc limit 1) as "lastLessonId"
       from public.academy_enrollments e join public.academy_courses c on c.id = e.course_id
      where e.learner_id = $1 and c.published order by e.enrolled_at desc`, [learnerId]);
  const certs = await pool.query(
    `select code, course_title as "courseTitle", issued_at as "issuedAt" from public.academy_certificates where learner_id = $1 order by issued_at desc`, [learnerId]);
  return { courses: courses.rows, certificates: certs.rows, streak: await learningStreak(learnerId) };
}
