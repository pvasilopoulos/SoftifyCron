export function interpolateSecrets(
  text: string,
  lookup: (key: string) => string | undefined,
) {
  return text.replace(/\{\{SECRET:([A-Z][A-Z0-9_]*)\}\}/g, (_all, key: string) => {
    const value = lookup(key);
    if (value == null) throw new Error(`Unknown secret ${key}`);
    return value;
  });
}
