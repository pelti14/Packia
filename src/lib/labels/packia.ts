import crypto from "node:crypto";
import bwipjs from "bwip-js/node";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Address } from "@/lib/types";
import { countryCode, sender } from "./sender";

/** Seguimiento interno: PK + AAMMDD + 6 caracteres aleatorios. */
export function internalTrackingNumber(now = new Date()) {
  const ymd = now.toISOString().slice(2, 10).replace(/-/g, "");
  return `PK${ymd}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

const MM = 72 / 25.4;
const W = 100 * MM;
const H = 150 * MM;

/** pdf-lib con fuentes estándar solo admite WinAnsi: quitamos lo que no se puede dibujar. */
const safe = (s: string | undefined) => (s ?? "").replace(/[^\x20-\x7E -ÿ€]/g, "");

export type LabelData = {
  orderNumber: string;
  clientName: string;
  carrier: string;
  trackingNumber: string;
  weightGrams: number;
  units: number;
  address: Address;
};

/** Etiqueta 10×15 cm (impresora térmica) con remitente, destinatario y código de barras. */
export async function renderInternalLabel(data: LabelData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Etiqueta ${data.orderNumber}`);
  const page = pdf.addPage([W, H]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.04, 0.07, 0.14);
  const m = 5 * MM;

  const text = (s: string, x: number, y: number, size: number, f = font) => page.drawText(safe(s), { x, y, size, font: f, color: ink });
  const rule = (y: number) => page.drawLine({ start: { x: m, y }, end: { x: W - m, y }, thickness: 1, color: ink });

  // Cabecera: agencia y peso
  let y = H - m - 14;
  text(data.carrier.toUpperCase(), m, y, 18, bold);
  const kg = `${(data.weightGrams / 1000).toFixed(2)} kg`;
  text(kg, W - m - bold.widthOfTextAtSize(kg, 14), y + 2, 14, bold);
  y -= 12;
  text(`Pedido ${data.orderNumber} · ${data.clientName} · ${data.units} uds.`, m, y, 8);
  y -= 6;
  rule(y);

  // Remitente
  const s = await sender();
  y -= 12;
  text("REMITENTE", m, y, 7, bold);
  y -= 10;
  text(s.name, m, y, 9, bold);
  y -= 10;
  text(`${s.address}, ${s.zip} ${s.city} (${s.country})`, m, y, 8);
  if (s.phone) {
    y -= 10;
    text(`Tel. ${s.phone}`, m, y, 8);
  }
  y -= 8;
  rule(y);

  // Destinatario
  const a = data.address;
  y -= 14;
  text("DESTINATARIO", m, y, 7, bold);
  y -= 18;
  text(a.name, m, y, 15, bold);
  for (const line of [a.address1, a.address2].filter(Boolean) as string[]) {
    y -= 15;
    text(line, m, y, 12);
  }
  y -= 22;
  text(`${a.zip}  ${a.city}`.toUpperCase(), m, y, 18, bold);
  y -= 15;
  text([a.province, countryCode(a)].filter(Boolean).join(" · "), m, y, 11);
  if (a.phone) {
    y -= 14;
    text(`Tel. ${a.phone}`, m, y, 10);
  }

  // Código de barras del seguimiento
  const png = await bwipjs.toBuffer({ bcid: "code128", text: data.trackingNumber, scale: 3, height: 16, includetext: false });
  const img = await pdf.embedPng(png);
  const bw = W - 2 * m;
  const bh = 26 * MM;
  page.drawImage(img, { x: m, y: m + 14, width: bw, height: bh });
  const t = data.trackingNumber;
  text(t, (W - bold.widthOfTextAtSize(t, 12)) / 2, m + 2, 12, bold);
  rule(m + 14 + bh + 6);

  return pdf.save();
}

/** Une varias etiquetas en un único PDF para imprimir en bloque. */
export async function mergePdfs(files: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const file of files) {
    const src = await PDFDocument.load(file);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}
