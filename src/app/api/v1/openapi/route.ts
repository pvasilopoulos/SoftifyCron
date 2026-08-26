import { OPENAPI_DOC } from "@/lib/openapi";
import { apiJson, apiOptions } from "@/lib/api-http";

export function OPTIONS() {
  return apiOptions();
}

export async function GET() {
  return apiJson(OPENAPI_DOC);
}
