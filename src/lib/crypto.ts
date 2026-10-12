import crypto from "node:crypto";

/**
 * Cifrado de credenciales de tiendas (tokens y claves de API) con AES-256-GCM.
 * Formato guardado: "enc:v1:<base64(iv | tag | texto cifrado)>".
 */
const PREFIX = "enc:v1:";

function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("Falta ENCRYPTION_KEY: genera una con `openssl rand -base64 32`");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("ENCRYPTION_KEY debe ser de 32 bytes en base64");
  return k;
}

export function encrypt(plain: string): string;
export function encrypt(plain: string | null | undefined): string | null;
export function encrypt(plain: string | null | undefined): string | null {
  if (!plain) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

export function decrypt(value: string | null | undefined): string | null {
  if (!value) return null;
  // Valores antiguos sin cifrar (o datos demo) se devuelven tal cual.
  if (!value.startsWith(PREFIX)) return value;
  const buf = Buffer.from(value.slice(PREFIX.length), "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}
