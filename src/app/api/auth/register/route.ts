import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validators";
import { registerUser } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { jsonError, zodError } from "@/lib/http";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  try {
    const { token } = await registerUser(parsed.data);
    await setSessionCookie(token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return jsonError(message, 400);
  }
}
