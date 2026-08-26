import { NextResponse } from "next/server";
import { runBotText, tenantByBotSecret } from "@/lib/bot-dispatch";

export async function POST(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret") ?? "";
  const tenant = await tenantByBotSecret("slack", secret);
  if (!tenant) return NextResponse.json({ ok: false }, { status: 401 });
  const raw = await request.text();
  const params = new URLSearchParams(raw);
  const text = params.get("text") || params.get("command") || "";
  const result = await runBotText(tenant.id, text.startsWith("/") ? text : `/${text}`);
  return new NextResponse(result.message, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
