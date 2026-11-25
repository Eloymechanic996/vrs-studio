import { describe, expect, it } from "vitest";
import { lapTimeProblem, MAX_PASTED_LAPS, parseLapList, parseLapTime } from "./utils";

describe("tiempos escritos a mano", () => {
  it("entiende los formatos habituales", () => {
    expect(parseLapTime("1:23.456")).toBe(83456);
    expect(parseLapTime("1:23,456")).toBe(83456);
    expect(parseLapTime("45.4")).toBe(45400);
  });

  it("entiende los formatos del móvil (sin ':') y de las hojas de tiempos", () => {
    expect(parseLapTime("1.23.456")).toBe(83456);
    expect(parseLapTime("1,23,456")).toBe(83456);
    expect(parseLapTime("1'23.456")).toBe(83456);
    expect(parseLapTime("1'23\"456")).toBe(83456);
    expect(parseLapTime("1’23.4")).toBe(83400);
    expect(parseLapTime(" 2'05 ")).toBe(125000);
    // Separadores de CSV al final de la línea
    expect(parseLapList("1:23.456,\n1:24.000;", 5).laps.map((l) => l.ms)).toEqual([83456, 84000]);
  });

  it("rechaza tiempos imposibles", () => {
    expect(parseLapTime("40000:00")).toBeNull();
    expect(parseLapTime("99999999999999999999:00")).toBeNull();
    expect(parseLapTime("1:60")).toBeNull();
    expect(parseLapTime("1.60.000")).toBeNull();
    expect(parseLapTime("-5")).toBeNull();
    expect(parseLapTime("hola")).toBeNull();
  });

  it("avisa de tiempos demasiado cortos con un mensaje que ayuda", () => {
    expect(lapTimeProblem(parseLapTime("1.23"), 5)).toMatch(/1:23/);
    expect(lapTimeProblem(parseLapTime("0.001"), 5)).not.toBeNull();
    expect(lapTimeProblem(null, 5)).not.toBeNull();
    expect(lapTimeProblem(parseLapTime("1:23.456"), 5)).toBeNull();
  });
});

describe("pegar una lista de vueltas", () => {
  it("lee tiempos sueltos y tablas con número de vuelta", () => {
    const text = [
      "Vuelta\tTiempo", // cabecera: se ignora
      "1\t1:23.456",
      "2  1:22.900",
      "Vuelta 3: 1'24.1",
      "4. 1.25.000",
      "",
      "5) 58,321",
      "1:21.5",
    ].join("\n");
    const r = parseLapList(text, 5);
    expect(r.laps.map((l) => l.ms)).toEqual([83456, 82900, 84100, 85000, 58321, 81500]);
    expect(r.laps[0].line).toBe(2);
    expect(r.errors).toEqual([]);
    expect(r.ignored).toBe(1);
  });

  it("señala las líneas con error sin perder las buenas", () => {
    const r = parseLapList("1:23.4\n7\n1:99.0\n2:00:00\n1:24.0\n0.5", 5);
    expect(r.laps.map((l) => l.ms)).toEqual([83400, 84000]);
    expect(r.errors.map((e) => e.line)).toEqual([2, 3, 4, 6]);
    expect(r.errors[3].reason).toMatch(/corto/);
  });

  it("no acepta más del máximo de vueltas de una vez", () => {
    const r = parseLapList(Array(MAX_PASTED_LAPS + 5).fill("1:30.0").join("\n"), 5);
    expect(r.laps).toHaveLength(MAX_PASTED_LAPS);
    expect(r.errors).toHaveLength(5);
  });

  it("aguanta basura sin romperse", () => {
    const r = parseLapList("<script>alert(1)</script>\n" + "9".repeat(5000) + "\n\u0000\u202e1:23", 5);
    expect(r.laps).toEqual([{ line: 3, ms: 83000 }]);
    // "<script>alert(1)</script>" tiene un dígito: se marca como línea con error.
    expect(r.errors.map((e) => e.line)).toEqual([1, 2]);
    expect(r.errors[1].text.length).toBeLessThanOrEqual(60);
  });
});
