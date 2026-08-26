import { NextResponse } from "next/server";
import { OPENAPI_DOC } from "@/lib/openapi";

export async function GET() {
  return NextResponse.json(OPENAPI_DOC);
}
