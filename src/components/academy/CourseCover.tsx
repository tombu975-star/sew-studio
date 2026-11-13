import type { CourseCard } from "@/lib/academy/data";

/** A course picture: the uploaded cover, or a stitched-pattern design in the course colour. */
export function CourseCover({ course, className = "" }: { course: Pick<CourseCard, "coverMediaId" | "accent" | "title" | "level">; className?: string }) {
  if (course.coverMediaId) return <img src={`/api/academy/media/${course.coverMediaId}`} alt="" loading="lazy" className={`object-cover ${className}`} />;
  const id = `p${course.title.length}${course.accent.slice(1)}`;
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg, ${course.accent}, #2b0712)` }} aria-hidden="true">
      <svg className="absolute inset-0 size-full" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
        <defs><pattern id={id} width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><path d="M0 13h26" stroke="#e6c58d" strokeOpacity=".32" strokeWidth="1.4" strokeDasharray="6 5" /></pattern></defs>
        <rect width="400" height="240" fill={`url(#${id})`} />
        <circle cx="318" cy="60" r="74" fill="none" stroke="#f2c14e" strokeOpacity=".55" strokeWidth="1.5" strokeDasharray="3 6" />
        <circle cx="318" cy="60" r="46" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="1" />
      </svg>
      <span className="absolute bottom-4 left-5 font-[family-name:var(--font-serif)] text-xl font-semibold text-white/90">{course.level}</span>
    </div>
  );
}
