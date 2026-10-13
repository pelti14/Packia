import nodemailer from "nodemailer";

/**
 * Envío de emails por SMTP (por ejemplo, un buzón de Hostinger).
 * Variables: SMTP_HOST, SMTP_PORT (465 o 587), SMTP_USER, SMTP_PASS y SMTP_FROM.
 * Si no están, no se envía nada (y se registra como «omitido»).
 */
export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transport: nodemailer.Transporter | null = null;
function transporter() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

/** Quita saltos de línea y comillas de un nombre visible (evita inyectar cabeceras). */
const cleanName = (s: string) => s.replace(/[\r\n"<>]/g, " ").trim().slice(0, 80);

export async function sendMail(m: { to: string; subject: string; html: string; text: string; fromName?: string; replyTo?: string | null }) {
  if (!mailConfigured()) return { skipped: true as const };
  const address = process.env.SMTP_FROM || process.env.SMTP_USER!;
  await transporter().sendMail({
    from: m.fromName ? { name: cleanName(m.fromName), address } : address,
    to: m.to,
    replyTo: m.replyTo || undefined,
    subject: m.subject.replace(/[\r\n]/g, " "),
    html: m.html,
    text: m.text,
  });
  return { skipped: false as const };
}
