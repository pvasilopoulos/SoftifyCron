export type LiteSchema = {
  type?: string;
  required?: string[];
  properties?: Record<string, { type?: string }>;
};

export function parseLiteSchema(raw: string | null | undefined): LiteSchema | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON schema must be an object");
  }
  const row = parsed as Record<string, unknown>;
  const properties: Record<string, { type?: string }> = {};
  if (row.properties && typeof row.properties === "object" && !Array.isArray(row.properties)) {
    for (const [key, value] of Object.entries(row.properties as Record<string, unknown>)) {
      if (value && typeof value === "object" && !Array.isArray(value) && typeof (value as { type?: unknown }).type === "string") {
        properties[key] = { type: (value as { type: string }).type };
      } else {
        properties[key] = {};
      }
    }
  }
  return {
    type: typeof row.type === "string" ? row.type : undefined,
    required: Array.isArray(row.required) ? row.required.filter((item): item is string => typeof item === "string") : [],
    properties,
  };
}

export function checkLiteSchema(body: string | null, schema: LiteSchema | null): string | null {
  if (!schema) return null;
  let data: unknown;
  try {
    data = JSON.parse(body ?? "");
  } catch {
    return "Response is not JSON";
  }
  return validateNode(data, schema, "$");
}

function typeOf(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function validateNode(data: unknown, schema: LiteSchema, path: string): string | null {
  if (schema.type && typeOf(data) !== schema.type) {
    return `${path} expected ${schema.type}, got ${typeOf(data)}`;
  }
  if (schema.type === "object" || schema.required?.length || Object.keys(schema.properties ?? {}).length) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return `${path} expected object`;
    }
    const row = data as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in row)) return `${path}.${key} is required`;
    }
    for (const [key, prop] of Object.entries(schema.properties ?? {})) {
      if (!(key in row) || !prop.type) continue;
      if (typeOf(row[key]) !== prop.type) return `${path}.${key} expected ${prop.type}, got ${typeOf(row[key])}`;
    }
  }
  return null;
}
