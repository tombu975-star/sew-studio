import { endSession } from "@/lib/academy/auth";
import { json } from "@/lib/academy/http";
export async function POST() { await endSession(); return json({ ok: true }); }
