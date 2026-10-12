/** Opciones de impresora para formularios (sin dependencias de servidor). */
export const PRINT_FORMAT_OPTIONS = [
  { value: "THERMAL_100x150", label: "Térmica 10 × 15 cm", hint: "Zebra, Xprinter, Rollo, Brother… La más habitual para paquetería." },
  { value: "THERMAL_4x6", label: "Térmica 4 × 6\"", hint: "Rollos de 102 × 152 mm. Casi igual que 10 × 15." },
  { value: "A4_4", label: "A4 · 4 etiquetas por hoja", hint: "Impresora normal con hojas adhesivas A6 (105 × 148 mm)." },
  { value: "A4_1", label: "A4 · 1 etiqueta por hoja", hint: "Impresora normal y papel corriente." },
] as const;

export type PrintSettingsValues = {
  printFormat: string;
  printOffsetX: number;
  printOffsetY: number;
  printScale: number;
  printRotate180: boolean;
  printAutoDialog: boolean;
  printOnPack: boolean;
  printSort: string;
};
