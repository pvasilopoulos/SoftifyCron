import * as webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret, hashToken } from "@/lib/crypto";
import { appUrl } from "@/lib/app-url";

const VAPID_ID = "vapid";

export type PushKeys = { p256dh: string; auth: string };

export async function ensureVapid() {
  const existing = await prisma.appMeta.findUnique({ where: { id: VAPID_ID } });
  if (existing) {
    return {
      publicKey: existing.vapidPublic,
      privateKey: decryptSecret(existing.vapidPrivateEnc),
    };
  }
  const keys = webpush.generateVAPIDKeys();
  await prisma.appMeta.create({
    data: {
      id: VAPID_ID,
      vapidPublic: keys.publicKey,
      vapidPrivateEnc: encryptSecret(keys.privateKey),
    },
  });
  return { publicKey: keys.publicKey, privateKey: keys.privateKey };
}

export async function publicVapidKey() {
  return (await ensureVapid()).publicKey;
}

function vapidSubject() {
  const origin = appUrl();
  if (origin.startsWith("https://") || origin.startsWith("http://localhost")) return origin;
  return "mailto:cron@softify.gr";
}

export async function savePushSubscription(input: {
  userId: string;
  tenantId: string;
  endpoint: string;
  keys: PushKeys;
}) {
  const endpoint = input.endpoint.trim();
  if (!endpoint.startsWith("https://")) throw new Error("Push endpoint must be https");
  const p256dh = input.keys.p256dh.trim();
  const auth = input.keys.auth.trim();
  if (p256dh.length < 10 || auth.length < 8) throw new Error("Push keys are invalid");
  const endpointHash = hashToken(endpoint);
  return prisma.pushSubscription.upsert({
    where: { userId_endpointHash: { userId: input.userId, endpointHash } },
    create: {
      userId: input.userId,
      tenantId: input.tenantId,
      endpoint,
      endpointHash,
      p256dh,
      auth,
    },
    update: { tenantId: input.tenantId, endpoint, p256dh, auth },
  });
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  const endpointHash = hashToken(endpoint.trim());
  await prisma.pushSubscription.deleteMany({ where: { userId, endpointHash } });
}

export async function sendTenantPush(
  tenantId: string,
  payload: { title: string; body: string; url?: string },
) {
  const subs = await prisma.pushSubscription.findMany({ where: { tenantId } });
  if (subs.length === 0) return { sent: 0 };
  const vapid = await ensureVapid();
  webpush.setVapidDetails(vapidSubject(), vapid.publicKey, vapid.privateKey);
  const body = JSON.stringify({
    title: payload.title.slice(0, 120),
    body: payload.body.slice(0, 240),
    url: payload.url || "/inbox",
  });
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
        { TTL: 3600 },
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
      } else {
        console.error("[push] send failed", sub.id, error);
      }
    }
  }
  if (sent === 0) throw new Error("No push deliveries succeeded");
  return { sent };
}
