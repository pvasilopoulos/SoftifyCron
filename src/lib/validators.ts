import { z } from "zod";
import { JOB_TYPES, PERMISSIONS } from "@/lib/acl";
import { HTTP_METHODS } from "@/lib/constants";
import { serializeNotifyList } from "@/lib/notify-events";

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

export const tenantNotifySchema = z.object({
  notifyEmail: z.string().max(2000).optional(),
  smtpHost: z.string().trim().max(255).optional().or(z.literal("")),
  smtpPort: z.union([z.number(), z.string(), z.null()]).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().trim().max(160).optional().or(z.literal("")),
  smtpPass: z.string().max(400).optional().or(z.literal("")),
  smtpFrom: z.string().trim().max(190).optional().or(z.literal("")),
  telegramChatId: z.string().max(500).optional().or(z.literal("")),
  telegramBotToken: z.string().trim().max(200).optional().or(z.literal("")),
  clearTelegramToken: z.boolean().optional(),
  slackWebhookUrl: z.string().max(2048).optional().or(z.literal("")),
  clearSlackWebhook: z.boolean().optional(),
  rotateWebhookSecret: z.boolean().optional(),
  defaultNotifyEmailOn: z.union([z.array(z.string()), z.string()]).optional(),
  defaultNotifyTelegramOn: z.union([z.array(z.string()), z.string()]).optional(),
  defaultNotifyWebhookOn: z.union([z.array(z.string()), z.string()]).optional(),
  defaultNotifySlackOn: z.union([z.array(z.string()), z.string()]).optional(),
  quietHoursStart: z.string().max(5).optional(),
  quietHoursEnd: z.string().max(5).optional(),
  quietHoursAllow: z.union([z.array(z.string()), z.string()]).optional(),
  notifyCooldownSec: z.union([z.number(), z.string()]).optional(),
  runRetentionDays: z.union([z.number(), z.string()]).optional(),
  bodyKeepLast: z.union([z.number(), z.string()]).optional(),
  maxConcurrent: z.union([z.number(), z.string()]).optional(),
  catchUpMissed: z.boolean().optional(),
  skipGreekHolidays: z.boolean().optional(),
  escalateEmail: z.string().max(2000).optional(),
  escalateAfter: z.union([z.number(), z.string()]).optional(),
  statusPageEnabled: z.boolean().optional(),
  statusPageSlug: z.string().max(80).optional(),
});

export const notifyTestSchema = z.object({
  channel: z.enum(["email", "telegram", "slack"]),
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

const notifyListSchema = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((value) => (value == null ? undefined : serializeNotifyList(value)));

function intField(fallback: number, min: number, max: number) {
  return z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value == null || value === "") return fallback;
      const n = typeof value === "number" ? value : Number(value);
      return Number.isFinite(n) ? n : fallback;
    })
    .pipe(z.number().int().min(min).max(max));
}

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
  timeoutMs: intField(30_000, 1000, 120_000),
  retryMax: intField(0, 0, 10),
  retryDelaySec: intField(60, 10, 86_400),
  notifyUrl: z.union([z.url().max(2048), z.literal(""), z.null()]).optional(),
  notifyEmailOn: notifyListSchema,
  notifyTelegramOn: notifyListSchema,
  notifyWebhookOn: notifyListSchema,
  notifySlackOn: notifyListSchema,
  keepResponse: z.boolean().default(false),
  responseBoard: z.boolean().default(false),
  pauseAfter: intField(0, 0, 100),
  enabled: z.boolean().default(true),
  followUpJobId: z.string().optional().nullable(),
  dependsOnJobId: z.string().optional().nullable(),
  assertStatus: intField(0, 0, 599),
  assertJsonPath: z.string().max(240).optional().default(""),
  assertEquals: z.string().max(500).optional().default(""),
  assertContains: z.string().max(500).optional().default(""),
  slowAfterMs: intField(0, 0, 3_600_000),
  skipHolidays: z.boolean().default(false),
  skipWeekends: z.boolean().default(false),
  activeHoursStart: z.string().max(5).optional().default(""),
  activeHoursEnd: z.string().max(5).optional().default(""),
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
