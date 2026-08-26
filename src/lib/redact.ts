export function redactSecrets(text: string | null | undefined, secrets: string[]) {
  let out = String(text ?? "");
  const needles = secrets.filter((item) => item.length >= 4).sort((a, b) => b.length - a.length);
  for (const secret of needles) {
    out = out.split(secret).join("[redacted]");
  }
  return out;
}
