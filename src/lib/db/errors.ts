/** Postgres "undefined_table" / "undefined_column": migrations haven't been applied yet. */
export function isMissingSchema(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return code === "42P01" || code === "42703";
}

export const MIGRATE_HINT =
  "The database is missing the latest updates. Run `npm run db:migrate` (or restart the dev server / redeploy) and try again.";

export function dbErrorResponse(err: unknown, tag: string) {
  console.error(`[${tag}]`, err);
  if (isMissingSchema(err)) return Response.json({ error: MIGRATE_HINT }, { status: 503 });
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
