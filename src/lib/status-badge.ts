export function statusBadgeSvg(label: string, ok: boolean) {
  const fill = ok ? "#1f8a4c" : "#c23b3b";
  const text = ok ? "operational" : "degraded";
  const title = `${label} ${text}`;
  const width = Math.max(118, 12 + label.length * 7 + 88);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <rect width="${width}" height="20" rx="3" fill="#2b2f36"/>
  <rect x="${width - 88}" width="88" height="20" rx="3" fill="${fill}"/>
  <text x="8" y="14" fill="#fff" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">${escapeXml(label)}</text>
  <text x="${width - 80}" y="14" fill="#fff" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">${text}</text>
</svg>`;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
