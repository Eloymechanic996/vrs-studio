/**
 * Un .xlsx es un zip. Antes de abrir una plantilla subida por el usuario se
 * suma lo que ocuparía descomprimida leyendo el índice del zip (sin
 * descomprimir nada): un archivo de pocos KB que se infla a varios GB tumbaría
 * el servidor.
 */
export const MAX_UNZIPPED_BYTES = 50 * 1024 * 1024;
const MAX_ENTRIES = 2000;

const EOCD_SIG = 0x06054b50;
const CENTRAL_SIG = 0x02014b50;

/** null si la plantilla es razonable; si no, el motivo en español. */
export function xlsxTemplateProblem(buffer: ArrayBuffer | Uint8Array): string | null {
  const view =
    buffer instanceof Uint8Array
      ? new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      : new DataView(buffer);
  const len = view.byteLength;

  // El final del índice está en los últimos 22 bytes + un comentario de hasta 64 KB.
  let eocd = -1;
  for (let i = len - 22; i >= Math.max(0, len - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return "El archivo no es un .xlsx válido.";

  const entries = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  if (entries === 0xffff || offset === 0xffffffff) return "La plantilla es demasiado grande.";
  if (entries > MAX_ENTRIES) return "La plantilla tiene demasiados elementos.";

  let total = 0;
  for (let n = 0; n < entries; n++) {
    if (offset + 46 > len || view.getUint32(offset, true) !== CENTRAL_SIG) {
      return "El archivo no es un .xlsx válido.";
    }
    const size = view.getUint32(offset + 24, true);
    if (size === 0xffffffff) return "La plantilla es demasiado grande.";
    total += size;
    if (total > MAX_UNZIPPED_BYTES) return "La plantilla es demasiado grande una vez descomprimida.";
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}
