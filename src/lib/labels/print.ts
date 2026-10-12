import { PDFDocument, PDFName, PDFString, StandardFonts, degrees, rgb, type PDFEmbeddedPage } from "pdf-lib";
import { db } from "@/lib/db";

const MM = 72 / 25.4;

export type PrintFormat = "THERMAL_100x150" | "THERMAL_4x6" | "A4_4" | "A4_1";

export const PRINT_FORMATS: Record<PrintFormat, { label: string; hint: string; page: [number, number]; cols: number; rows: number }> = {
  THERMAL_100x150: { label: "Térmica 10 × 15 cm (100 × 150 mm)", hint: "Zebra, Rollo, Xprinter, Brother QL… La más habitual para paquetería.", page: [100, 150], cols: 1, rows: 1 },
  THERMAL_4x6: { label: "Térmica 4 × 6 pulgadas (102 × 152 mm)", hint: "Rollos americanos de 4×6\". Casi igual que 10×15.", page: [101.6, 152.4], cols: 1, rows: 1 },
  A4_4: { label: "A4 con 4 etiquetas por hoja (A6)", hint: "Impresora normal con hojas adhesivas de 4 etiquetas (105 × 148 mm).", page: [210, 297], cols: 2, rows: 2 },
  A4_1: { label: "A4, una etiqueta por hoja", hint: "Impresora normal y papel corriente: se recorta y se pega con funda o cinta.", page: [210, 297], cols: 1, rows: 1 },
};

export type PrintSettings = {
  format: PrintFormat;
  offsetX: number;
  offsetY: number;
  scale: number;
  rotate180: boolean;
  autoDialog: boolean;
  printOnPack: boolean;
  sort: "CLIENT" | "CARRIER" | "TIME";
};

export async function getPrintSettings(): Promise<PrintSettings> {
  const s = await db.appSettings
    .findUnique({ where: { id: "default" }, select: { printFormat: true, printOffsetX: true, printOffsetY: true, printScale: true, printRotate180: true, printAutoDialog: true, printSort: true, printOnPack: true } })
    .catch(() => null);
  return {
    format: (s?.printFormat && s.printFormat in PRINT_FORMATS ? s.printFormat : "THERMAL_100x150") as PrintFormat,
    offsetX: s?.printOffsetX ?? 0,
    offsetY: s?.printOffsetY ?? 0,
    scale: s?.printScale ?? 100,
    rotate180: s?.printRotate180 ?? false,
    autoDialog: s?.printAutoDialog ?? true,
    printOnPack: s?.printOnPack ?? true,
    sort: (s?.printSort ?? "CARRIER") as PrintSettings["sort"],
  };
}

/**
 * Coloca etiquetas (de Packia o de Sendcloud, cualquier tamaño) en el formato de la impresora:
 * una por página en térmica, 4 por hoja en A4… Ajusta tamaño, gira si hace falta y aplica la calibración.
 * Todas seguidas en un solo PDF, listo para imprimir de una vez.
 */
export async function layoutLabels(files: Uint8Array[], s: PrintSettings, opts: { guides?: boolean } = {}): Promise<Uint8Array> {
  const f = PRINT_FORMATS[s.format];
  const out = await PDFDocument.create();
  out.setTitle("Etiquetas");
  const [pw, ph] = [f.page[0] * MM, f.page[1] * MM];
  const cellW = pw / f.cols;
  const cellH = ph / f.rows;
  const perPage = f.cols * f.rows;

  // Todas las páginas de todos los PDF, en orden.
  const labels: PDFEmbeddedPage[] = [];
  for (const file of files) {
    const src = await PDFDocument.load(file);
    const embedded = await out.embedPages(src.getPages());
    labels.push(...embedded);
  }

  const font = opts.guides ? await out.embedFont(StandardFonts.Helvetica) : null;
  let page = out.addPage([pw, ph]);
  labels.forEach((lab, i) => {
    if (i > 0 && i % perPage === 0) page = out.addPage([pw, ph]);
    const slot = i % perPage;
    const col = slot % f.cols;
    const row = Math.floor(slot / f.cols);
    const cx = col * cellW;
    const cy = ph - (row + 1) * cellH;

    // ¿Cabe mejor girada? (etiqueta apaisada en hueco vertical o al revés)
    const turn = lab.width > lab.height !== cellW > cellH;
    const w0 = turn ? lab.height : lab.width;
    const h0 = turn ? lab.width : lab.height;
    // Margen interior pequeño en A4 para que no corte la impresora.
    const pad = s.format.startsWith("A4") ? 3 * MM : 0;
    const fit = Math.min((cellW - 2 * pad) / w0, (cellH - 2 * pad) / h0);
    // Ocupa el hueco entero (una 10×15 en un rollo 10×15 queda a tamaño real); la escala permite afinar.
    const k = fit * (s.scale / 100);
    const w = w0 * k;
    const h = h0 * k;
    const bx = cx + (cellW - w) / 2 + s.offsetX * MM;
    const by = cy + (cellH - h) / 2 + s.offsetY * MM;

    let rot = (turn ? 90 : 0) + (s.rotate180 ? 180 : 0);
    rot %= 360;
    // drawPage gira alrededor de (x, y): colocamos el punto según el giro para que quede dentro del hueco.
    const pos =
      rot === 0 ? { x: bx, y: by } :
      rot === 90 ? { x: bx + w, y: by } :
      rot === 180 ? { x: bx + w, y: by + h } :
      { x: bx, y: by + h };
    page.drawPage(lab, { x: pos.x, y: pos.y, xScale: k, yScale: k, rotate: degrees(rot) });

    if (opts.guides && font) {
      page.drawRectangle({ x: cx + 1, y: cy + 1, width: cellW - 2, height: cellH - 2, borderColor: rgb(0.9, 0.2, 0.3), borderWidth: 0.6, borderDashArray: [3, 3] });
      page.drawText(`Hueco ${f.cols > 1 || f.rows > 1 ? slot + 1 : ""} · ${f.label}`, { x: cx + 4, y: cy + 4, size: 6, font, color: rgb(0.9, 0.2, 0.3) });
    }
  });

  if (s.autoDialog) {
    // Abre el diálogo de imprimir al abrir el PDF (Chrome, Edge y Acrobat lo respetan).
    const action = out.context.obj({ Type: "Action", S: "JavaScript", JS: PDFString.of("this.print({bUI: true, bSilent: false, bShrinkToFit: false});") });
    out.catalog.set(PDFName.of("OpenAction"), out.context.register(action));
  }
  return out.save();
}
