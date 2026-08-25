import { createHmac, randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret() {
  return base32Encode(randomBytes(20));
}

export function base32Encode(bytes: Uint8Array) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string) {
  const cleaned = input.toUpperCase().replace(/=+$/g, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of cleaned) {
    const idx = ALPHABET.indexOf(char);
    if (idx === -1) throw new Error("Invalid authenticator secret");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret: string, counter: number) {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(bin % 1_000_000).padStart(6, "0");
}

export function totpCode(secret: string, at = Date.now()) {
  return hotp(secret, Math.floor(at / 1000 / 30));
}

export function verifyTotp(secret: string, code: string, window = 1) {
  const trimmed = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(trimmed)) return false;
  const now = Date.now();
  for (let i = -window; i <= window; i += 1) {
    if (totpCode(secret, now + i * 30_000) === trimmed) return true;
  }
  return false;
}

export function totpOtpauth(email: string, secret: string) {
  const label = encodeURIComponent(`SoftifyCron:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=SoftifyCron&period=30&digits=6`;
}
