import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { DEFAULT_TELEGRAM_TEMPLATE } from "./notify-template";

export async function listNotifyTemplates(tenantId: string) {
  return prisma.notifyTemplate.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { jobs: true } },
    },
  });
}

export async function createNotifyTemplate(tenantId: string, input: { name: string; body?: string }) {
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new Error("Name is required");
  const count = await prisma.notifyTemplate.count({ where: { tenantId } });
  if (count >= 50) throw new Error("This workspace already has 50 Telegram templates");
  return prisma.notifyTemplate.create({
    data: {
      tenantId,
      name,
      body: (input.body?.trim() || DEFAULT_TELEGRAM_TEMPLATE).slice(0, 4000),
    },
  });
}

export async function updateNotifyTemplate(
  tenantId: string,
  id: string,
  input: { name?: string; body?: string },
) {
  const existing = await prisma.notifyTemplate.findFirst({ where: { id, tenantId } });
  if (!existing) return null;
  const data: Prisma.NotifyTemplateUpdateInput = {};
  if (input.name != null) {
    const name = input.name.trim().slice(0, 80);
    if (!name) throw new Error("Name is required");
    data.name = name;
  }
  if (input.body != null) {
    const body = input.body.trim();
    if (!body) throw new Error("Message body is required");
    data.body = body.slice(0, 4000);
  }
  return prisma.notifyTemplate.update({ where: { id }, data });
}

export async function deleteNotifyTemplate(tenantId: string, id: string) {
  const used = await prisma.cronJob.count({ where: { tenantId, telegramTemplateId: id } });
  if (used > 0) {
    throw new Error(`This template is used by ${used} job${used === 1 ? "" : "s"}`);
  }
  const result = await prisma.notifyTemplate.deleteMany({ where: { id, tenantId } });
  return result.count > 0;
}

export async function resolveTelegramTemplate(tenantId: string, id: string | null | undefined) {
  const templateId = id?.trim() || "";
  if (!templateId) return null;
  return prisma.notifyTemplate.findFirst({
    where: { id: templateId, tenantId },
    select: { id: true, body: true },
  });
}
