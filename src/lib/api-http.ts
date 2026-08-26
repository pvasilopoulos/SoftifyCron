import { NextResponse } from "next/server";
import { ZodError } from "zod";

export const API_CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "Authorization, Content-Type",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "access-control-max-age": "86400",
} as const;

export function apiOptions() {
  return new NextResponse(null, { status: 204, headers: API_CORS });
}

export function apiJson(data: unknown, init?: { status?: number; headers?: HeadersInit }) {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: { ...API_CORS, ...(init?.headers ?? {}) },
  });
}

export function apiError(message: string, status = 400, code?: string) {
  return apiJson({ error: message, ...(code ? { code } : {}) }, { status });
}

export function apiZodError(error: ZodError) {
  const first = error.issues[0];
  return apiError(first?.message ?? "Invalid input", 422, "invalid_input");
}

export function parseTakeSkip(searchParams: URLSearchParams, fallbackTake = 100, maxTake = 200) {
  const takeRaw = Number(searchParams.get("take") ?? fallbackTake);
  const skipRaw = Number(searchParams.get("skip") ?? 0);
  const take = Number.isFinite(takeRaw) ? Math.min(maxTake, Math.max(1, Math.trunc(takeRaw))) : fallbackTake;
  const skip = Number.isFinite(skipRaw) ? Math.max(0, Math.trunc(skipRaw)) : 0;
  return { take, skip };
}
