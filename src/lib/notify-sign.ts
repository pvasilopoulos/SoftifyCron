import { createHmac, timingSafeEqual } from "node:crypto";

export function signWebhookBody(secret: string, timestamp: string, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function webhookSignatureHeader(secret: string, timestamp: string, body: string) {
  return `sha256=${signWebhookBody(secret, timestamp, body)}`;
}

export function verifyWebhookSignature(input: {
  secret: string;
  timestamp: string;
  body: string;
  signature: string;
}) {
  const expected = webhookSignatureHeader(input.secret, input.timestamp, input.body);
  const given = input.signature.trim();
  const left = Buffer.from(expected);
  const right = Buffer.from(given);
  return left.length === right.length && timingSafeEqual(left, right);
}
