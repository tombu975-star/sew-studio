import { UUID, text } from "./http";
import { parseQuiz } from "./quiz";

/** Turns an admin form body into column values, or an error message. */
export function lessonValues(b: Record<string, any>, partial: boolean): { values: Record<string, unknown> } | { error: string } {
  const v: Record<string, unknown> = {};
  if (!partial || "title" in b) { const t = text(b.title, 150); if (!t) return { error: "Give the lesson a title." }; v.title = t; }
  if (!partial || "kind" in b) { if (!["video", "reading", "quiz"].includes(b.kind)) return { error: "Choose video, reading or quiz." }; v.kind = b.kind; }
  if ("section" in b) v.section = text(b.section, 80) || "Lessons";
  if ("summary" in b) v.summary = text(b.summary, 300) || null;
  if ("body" in b) v.body = typeof b.body === "string" ? b.body.slice(0, 40000) : null;
  if ("isPreview" in b) v.is_preview = b.isPreview === true;
  if ("durationSeconds" in b) v.duration_seconds = Math.max(0, Math.min(86400, Math.round(Number(b.durationSeconds) || 0)));
  if ("position" in b && Number.isInteger(b.position)) v.position = b.position;
  for (const [key, col] of [["mediaId", "media_id"], ["captionsMediaId", "captions_media_id"]] as const) {
    if (key in b) { if (b[key] !== null && !(typeof b[key] === "string" && UUID.test(b[key]))) return { error: "Invalid file." }; v[col] = b[key]; }
  }
  if ("quiz" in b) {
    if (b.quiz === null) v.quiz = null;
    else { const q = parseQuiz(b.quiz); if (!q) return { error: "Each question needs text, 2 to 6 answers and one marked correct." }; v.quiz = JSON.stringify(q); }
  }
  return { values: v };
}
