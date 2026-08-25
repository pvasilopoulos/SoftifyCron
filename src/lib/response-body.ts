/** MySQL LONGTEXT max payload in bytes (2^32 − 1). */
export const MYSQL_LONGTEXT_MAX_BYTES = 4_294_967_295;

export function fitMysqlLongText(text: string, maxBytes = MYSQL_LONGTEXT_MAX_BYTES): string {
  if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;
  let bytes = 0;
  let end = 0;
  for (const char of text) {
    const size = Buffer.byteLength(char, "utf8");
    if (bytes + size > maxBytes) break;
    bytes += size;
    end += char.length;
  }
  return text.slice(0, end);
}

export async function readBodyBytes(response: Response, maxBytes = MYSQL_LONGTEXT_MAX_BYTES) {
  const reader = response.body?.getReader();
  if (!reader) {
    const all = new Uint8Array(await response.arrayBuffer());
    return all.byteLength > maxBytes ? all.subarray(0, maxBytes) : all;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      const room = maxBytes - total;
      if (value.byteLength > room) {
        chunks.push(value.subarray(0, room));
        total += room;
        break;
      }
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* already closed */
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}
