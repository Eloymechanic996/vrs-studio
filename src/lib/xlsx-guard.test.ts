import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { xlsxTemplateProblem } from "./xlsx-guard";

describe("plantillas Excel subidas", () => {
  it("acepta un .xlsx normal", async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("Hoja1").getCell("A1").value = "hola";
    const buf = new Uint8Array(await wb.xlsx.writeBuffer());
    expect(xlsxTemplateProblem(buf)).toBeNull();
  });

  it("rechaza algo que no es un zip", () => {
    expect(xlsxTemplateProblem(new TextEncoder().encode("no soy un excel").buffer)).not.toBeNull();
    expect(xlsxTemplateProblem(new ArrayBuffer(0))).not.toBeNull();
  });

  it("rechaza un zip pequeño que se infla a cientos de MB", async () => {
    const zip = new JSZip();
    zip.file("xl/bomba.xml", "0".repeat(60 * 1024 * 1024));
    const buf = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
    expect(buf.byteLength).toBeLessThan(1024 * 1024);
    expect(xlsxTemplateProblem(buf)).toMatch(/descomprimida/);
  });
});
