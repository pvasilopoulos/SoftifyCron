import { NextResponse } from "next/server";
import { runBotText, tenantByBotSecret } from "@/lib/bot-dispatch";

export async function POST(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret") ?? "";
  const tenant = await tenantByBotSecret("telegram", secret);
  if (!tenant) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await request.json().catch(() => null)) as
    | { message?: { text?: string } }
    | null;
  const text = body?.message?.text ?? "";
  if (!text.startsWith("/")) return NextResponse.json({ ok: true });
  const result = await runBotText(tenant.id, text);
  return NextResponse.json(result);
}
