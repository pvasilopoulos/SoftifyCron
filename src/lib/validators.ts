import { z } from "zod";
import { JOB_TYPES } from "@/lib/acl";
import { HTTP_METHODS } from "@/lib/constants";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(160),
  password: z.string().min(8).max(128),
  organization: z.string().trim().min(2).max(80).optional().or(z.literal("")),
  invite: z.string().optional().nullable(),
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
  groupId: z.string().optional().nullable(),
  type: z.enum(JOB_TYPES).default("HTTP"),
  tags: z.string().max(500).optional().default(""),
  cronExpr: z.string().trim().min(1).max(120),
  timezone: z.string().trim().min(1).max(80),
  method: z.enum(HTTP_METHODS),
  url: z.url().max(2048),
  headers: z.record(z.string(), z.string()).optional().nullable(),
  body: z.string().max(100_000).optional().nullable(),
  timeoutMs: z.number().int().min(1000).max(120_000).default(30_000),
  retryMax: z.number().int().min(0).max(10).default(0),
  retryDelaySec: z.number().int().min(10).max(86_400).default(60),
  notifyUrl: z.union([z.url().max(2048), z.literal(""), z.null()]).optional(),
  enabled: z.boolean().default(true),
});

export const groupInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().optional(),
});

export const secretInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  key: z.string().trim().min(2).max(64),
  value: z.string().min(1).max(8000),
});

export const inviteInputSchema = z.object({
  email: z.email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export const bulkSchema = z.object({
  action: z.enum(["pause", "resume", "delete", "move", "run"]),
  ids: z.array(z.string()).min(1).max(100),
  groupId: z.string().nullable().optional(),
});

export type JobInput = z.infer<typeof jobInputSchema>;
