const LABEL_ALIASES: Record<string, string> = {
  utf8: "utf-8",
  "utf-8": "utf-8",
  unicode: "utf-8",
  "utf-16": "utf-16le",
  "utf-16le": "utf-16le",
  "utf-16be": "utf-16be",
  latin1: "iso-8859-1",
  "iso-8859-1": "iso-8859-1",
  "iso-8859-15": "iso-8859-15",
  "windows-1252": "windows-1252",
  cp1252: "windows-1252",
  win1252: "windows-1252",
  "win-1252": "windows-1252",
  ansi: "windows-1252",
  "windows-1253": "windows-1253",
  cp1253: "windows-1253",
  win1253: "windows-1253",
  "win-1253": "windows-1253",
  "iso-8859-7": "iso-8859-7",
  greek: "iso-8859-7",
  greek8: "iso-8859-7",
  "iso-ir-126": "iso-8859-7",
};

const SNIFF_ORDER = [
  "utf-8",
  "windows-1253",
  "iso-8859-7",
  "windows-1252",
  "iso-8859-1",
  "iso-8859-15",
] as const;

function normalizeLabel(raw: string) {
  const key = raw.trim().toLowerCase().replace(/[_]/g, "-");
  return LABEL_ALIASES[key] ?? LABEL_ALIASES[key.replace(/[^a-z0-9-]/g, "")] ?? null;
}

export function charsetFromContentType(contentType: string | null | undefined) {
  if (!contentType) return null;
  const match = /charset\s*=\s*("?)([^";\s]+)\1/i.exec(contentType);
  if (!match?.[2]) return null;
  return normalizeLabel(match[2]);
}

function decodeLabel(bytes: Uint8Array, label: string, fatal = false) {
  try {
    return new TextDecoder(label, { fatal, ignoreBOM: true }).decode(bytes);
  } catch {
    return null;
  }
}

function isValidUtf8(bytes: Uint8Array) {
  return decodeLabel(bytes, "utf-8", true) !== null;
}

function analyzeText(text: string) {
  let greek = 0;
  let latin = 0;
  let replacement = 0;
  let control = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code === 0xfffd) replacement += 1;
    else if (
      (code >= 0x0370 && code <= 0x03ff) ||
      (code >= 0x1f00 && code <= 0x1fff)
    ) {
      greek += 1;
    } else if (
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a) ||
      (code >= 0xc0 && code <= 0x024f)
    ) {
      latin += 1;
    } else if (code < 32 && char !== "\n" && char !== "\r" && char !== "\t") {
      control += 1;
    }
  }
  return {
    greek,
    latin,
    replacement,
    control,
    score: greek * 8 + latin - replacement * 25 - control * 4,
  };
}

function candidates(declared: string | null) {
  const labels: string[] = [];
  if (declared) labels.push(declared);
  for (const label of SNIFF_ORDER) {
    if (!labels.includes(label)) labels.push(label);
  }
  return labels;
}

function sniffBom(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return "utf-8";
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return "utf-16le";
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return "utf-16be";
  return null;
}

export function decodeHttpBody(
  bytes: Uint8Array,
  contentType?: string | null,
): { text: string; encoding: string } {
  if (bytes.byteLength === 0) return { text: "", encoding: "utf-8" };

  const bom = sniffBom(bytes);
  if (bom) {
    const text = decodeLabel(bytes, bom);
    if (text !== null) return { text, encoding: bom };
  }

  if (isValidUtf8(bytes)) {
    return { text: decodeLabel(bytes, "utf-8") ?? "", encoding: "utf-8" };
  }

  const declared = charsetFromContentType(contentType);
  let best: { text: string; encoding: string; score: number } | null = null;
  for (const label of candidates(declared)) {
    const text = decodeLabel(bytes, label);
    if (text === null) continue;
    const analysis = analyzeText(text);
    let score = analysis.score;
    if (declared && label === declared) score += 18;
    if ((label === "windows-1253" || label === "iso-8859-7") && analysis.greek < 2) {
      score -= 16;
    }
    if (!best || score > best.score) {
      best = { text, encoding: label, score };
    }
  }

  if (best) return { text: best.text, encoding: best.encoding };
  return { text: decodeLabel(bytes, "utf-8") ?? "", encoding: "utf-8" };
}
