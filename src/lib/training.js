// Given all skill modules and a trainee's progress rows, find the next one they haven't completed.
export function recommendNextCourse(courses, progressRows) {
  const map = Object.fromEntries((progressRows || []).map(p => [p.course_id, p.status]));
  const sorted = [...(courses || [])].sort((a, b) => (a.sequence ?? 999) - (b.sequence ?? 999));
  return sorted.find(c => (map[c.id] || 'Not Started') !== 'Completed') || null;
}