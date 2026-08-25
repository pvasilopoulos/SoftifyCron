import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators";
import { loginUser } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { jsonError, zodError } from "@/lib/http";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  try {
    const { token, payload } = await loginUser(
      parsed.data.email,
      parsed.data.password,
      typeof body?.invite === "string" ? body.invite : null,
    );
    await setSessionCookie(token);
    return NextResponse.json({
      ok: true,
      next: payload.platform && !payload.tid ? "/admin" : "/dashboard",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return jsonError(message, 401);
  }
}
