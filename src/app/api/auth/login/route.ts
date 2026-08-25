import { NextResponse } from "next/server";
import { loginSchema, totpCodeSchema } from "@/lib/validators";
import { loginUser, loginWithTotp } from "@/lib/auth";
import { homePath, setSessionCookie } from "@/lib/session";
import { jsonError, zodError } from "@/lib/http";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body && typeof body === "object" && "challenge" in body && "code" in body) {
    const parsed = totpCodeSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);
    try {
      const { token, payload } = await loginWithTotp(
        parsed.data.challenge,
        parsed.data.code,
        typeof body?.invite === "string" ? body.invite : null,
      );
      await setSessionCookie(token);
      return NextResponse.json({ ok: true, next: homePath(payload) });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Login failed", 401);
    }
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  try {
    const result = await loginUser(
      parsed.data.email,
      parsed.data.password,
      typeof body?.invite === "string" ? body.invite : null,
    );
    if ("needsTotp" in result) {
      return NextResponse.json({ ok: true, needsTotp: true, challenge: result.challenge });
    }
    await setSessionCookie(result.token);
    return NextResponse.json({ ok: true, next: homePath(result.payload) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return jsonError(message, 401);
  }
}
