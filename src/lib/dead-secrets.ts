const PATTERN = /\{\{SECRET:([A-Z][A-Z0-9_]*)\}\}/g;

export function secretKeysInText(text: string | null | undefined) {
  const keys = new Set<string>();
  const raw = String(text ?? "");
  for (const match of raw.matchAll(PATTERN)) {
    if (match[1]) keys.add(match[1]);
  }
  return [...keys];
}

export function deadSecretKeys(texts: Array<string | null | undefined>, known: string[]) {
  const have = new Set(known);
  const missing = new Set<string>();
  for (const text of texts) {
    for (const key of secretKeysInText(text)) {
      if (!have.has(key)) missing.add(key);
    }
  }
  return [...missing].sort();
}
