// Example Supabase Edge Function — deployed automatically by
// .github/workflows/deploy-edge-functions.yml on every push to main.
//
// Add more functions as sibling folders under supabase/functions/<name>/index.ts
// and they'll be picked up and deployed automatically — no workflow changes needed.

Deno.serve(async (_req: Request) => {
  return new Response(
    JSON.stringify({ status: "ok", service: "madam-studio", time: new Date().toISOString() }),
    { headers: { "Content-Type": "application/json" } },
  );
});
