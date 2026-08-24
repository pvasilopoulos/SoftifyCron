import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(160),
  password: z.string().min(8).max(128),
  organization: z.string().trim().min(2).max(80),
});

export const loginSchema = z.object({
  email: z.email().max(160),
  password: z.string().min(1).max(128),
});

export const tenantUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  timezone: z.string().trim().min(1).max(80),
});

export const jobInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  cronExpr: z.string().trim().min(1).max(120),
  timezone: z.string().trim().min(1).max(80),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  url: z.url().max(2048),
  headers: z.record(z.string(), z.string()).optional().nullable(),
  body: z.string().max(100_000).optional().nullable(),
  timeoutMs: z.number().int().min(1000).max(120_000).default(30_000),
  enabled: z.boolean().default(true),
});

export type JobInput = z.infer<typeof jobInputSchema>;
