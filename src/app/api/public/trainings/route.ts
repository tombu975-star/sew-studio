import { NextResponse } from "next/server";
import { loadPublicTrainings } from "@/lib/public-trainings";

export async function GET() {
  return NextResponse.json(await loadPublicTrainings(), { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
