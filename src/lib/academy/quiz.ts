export type QuizQuestion = { q: string; options: string[]; correct: number; explain?: string };

/** Validates a quiz coming from the admin editor. Returns null when it is not usable. */
export function parseQuiz(input: unknown): QuizQuestion[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 40) return null;
  const out: QuizQuestion[] = [];
  for (const item of input) {
    const q = typeof item?.q === "string" ? item.q.trim().slice(0, 400) : "";
    const options = Array.isArray(item?.options) ? item.options.map((o: unknown) => (typeof o === "string" ? o.trim().slice(0, 200) : "")).filter(Boolean) : [];
    const correct = Number(item?.correct);
    if (!q || options.length < 2 || options.length > 6 || !Number.isInteger(correct) || correct < 0 || correct >= options.length) return null;
    out.push({ q, options, correct, explain: typeof item?.explain === "string" ? item.explain.trim().slice(0, 500) : undefined });
  }
  return out;
}

/** What a learner is allowed to see before answering: no correct answers. */
export const publicQuiz = (quiz: QuizQuestion[]) => quiz.map(({ q, options }) => ({ q, options }));

export function grade(quiz: QuizQuestion[], answers: unknown, passMark: number) {
  const given = Array.isArray(answers) ? answers : [];
  const results = quiz.map((item, i) => ({ correct: given[i] === item.correct, answer: item.correct, explain: item.explain ?? null }));
  const score = results.filter((r) => r.correct).length;
  return { score, total: quiz.length, passed: quiz.length > 0 && (score / quiz.length) * 100 >= passMark, results };
}
