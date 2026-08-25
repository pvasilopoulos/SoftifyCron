import { z } from "zod";
import { JOB_TYPES, PERMISSIONS } from "@/lib/acl";
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
  notifyEmail: z.union([z.email().max(160), z.literal("")]).optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  nextPassword: z.string().min(8).max(128),
});

export const forgotSchema = z.object({
  email: z.email().max(160),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
});

export const totpCodeSchema = z.object({
  challenge: z.string().min(10),
  code: z.string().trim().min(6).max(12),
});

export const apiTokenNameSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const jobInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  groupId: z.string().optional().nullable(),
  groupName: z.string().trim().max(60).optional().nullable(),
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
  keepResponse: z.boolean().default(false),
  pauseAfter: z.number().int().min(0).max(100).default(0),
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
  role: z.string().trim().min(1).max(40).default("MEMBER"),
});

export const memberCreateSchema = z.object({
  email: z.email().max(160),
  name: z.string().trim().min(2).max(80).optional().or(z.literal("")),
  password: z.string().min(8).max(128).optional().or(z.literal("")),
  role: z.string().trim().min(1).max(40).default("MEMBER"),
});

export const memberRoleSchema = z.object({
  role: z.string().trim().min(1).max(40).optional(),
  roleKey: z.string().trim().min(1).max(40).optional(),
  grants: z.array(z.enum(PERMISSIONS)).optional(),
});

export const customerCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    ownerMode: z.enum(["create", "attach"]).default("create"),
    ownerName: z.string().trim().min(2).max(80).optional().or(z.literal("")),
    ownerEmail: z.email().max(160),
    ownerPassword: z.string().min(8).max(128).optional().or(z.literal("")),
    timezone: z.string().trim().min(1).max(80).default("Europe/Athens"),
  })
  .superRefine((value, ctx) => {
    if (value.ownerMode === "create") {
      if (!value.ownerName || value.ownerName.length < 2) {
        ctx.addIssue({ code: "custom", message: "Owner name is required", path: ["ownerName"] });
      }
      if (!value.ownerPassword || value.ownerPassword.length < 8) {
        ctx.addIssue({
          code: "custom",
          message: "Owner password must be at least 8 characters",
          path: ["ownerPassword"],
        });
      }
    }
  });

export const platformPersonSchema = z.object({
  email: z.email().max(160),
  name: z.string().trim().min(2).max(80).optional().or(z.literal("")),
  password: z.string().min(8).max(128).optional().or(z.literal("")),
  tenantId: z.string().min(1, "Select a tenant"),
  role: z.string().trim().min(1).max(40).default("MEMBER"),
});

export const platformInviteSchema = z.object({
  email: z.email(),
  role: z.string().trim().min(1).max(40).default("MEMBER"),
});

export const platformUserUpdateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  email: z.email().max(160),
  password: z.string().min(8).max(128).optional().or(z.literal("")),
});

export const platformUserRoleSchema = z
  .object({
    userId: z.string().min(1),
    membershipId: z.string().optional().or(z.literal("")),
    tenantId: z.string().optional().or(z.literal("")),
    role: z.string().trim().min(1).max(40),
  })
  .superRefine((value, ctx) => {
    if (!value.membershipId && !value.tenantId) {
      ctx.addIssue({
        code: "custom",
        message: "Select a tenant",
        path: ["tenantId"],
      });
    }
  });

export const tenantRoleInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(240).optional().or(z.literal("")),
  permissions: z.array(z.enum(PERMISSIONS)).default([]),
});

export const tenantRoleUpdateSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(240).optional(),
  permissions: z.array(z.enum(PERMISSIONS)).optional(),
  reassignTo: z.string().trim().min(1).max(40).optional(),
});

export const bulkSchema = z.object({
  action: z.enum(["pause", "resume", "delete", "move", "run"]),
  ids: z.array(z.string()).min(1).max(100),
  groupId: z.string().nullable().optional(),
});

export type JobInput = z.infer<typeof jobInputSchema>;
