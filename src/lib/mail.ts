export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string | null;
  pass?: string | null;
  from: string;
};

export function envSmtp(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  if (!host || !from) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    user: process.env.SMTP_USER?.trim() || null,
    pass: process.env.SMTP_PASS ?? null,
    from,
  };
}

export function mailConfigured(smtp?: SmtpConfig | null) {
  return Boolean((smtp ?? envSmtp())?.host && (smtp ?? envSmtp())?.from);
}

export async function sendMail(
  input: { to: string | string[]; subject: string; text: string },
  smtp?: SmtpConfig | null,
) {
  const config = smtp ?? envSmtp();
  const to = Array.isArray(input.to) ? input.to.filter(Boolean).join(", ") : input.to;
  if (!config) {
    console.info(`[mail:log] to=${to} subject=${input.subject}\n${input.text}`);
    return { sent: false };
  }

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure || config.port === 465,
    auth: config.user ? { user: config.user, pass: config.pass ?? undefined } : undefined,
  });
  await transporter.sendMail({
    from: config.from,
    to,
    subject: input.subject,
    text: input.text,
  });
  return { sent: true };
}
