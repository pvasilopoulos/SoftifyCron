export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim());
}

export async function sendMail(input: { to: string; subject: string; text: string }) {
  if (!mailConfigured()) {
    console.info(`[mail:log] to=${input.to} subject=${input.subject}\n${input.text}`);
    return { sent: false };
  }

  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
  return { sent: true };
}
