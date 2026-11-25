import { describe, expect, it } from "vitest";
import { lapTimeProblem, parseLapTime } from "./utils";

describe("tiempos escritos a mano", () => {
  it("entiende los formatos habituales", () => {
    expect(parseLapTime("1:23.456")).toBe(83456);
    expect(parseLapTime("1:23,456")).toBe(83456);
    expect(parseLapTime("45.4")).toBe(45400);
  });

  it("rechaza tiempos imposibles", () => {
    expect(parseLapTime("40000:00")).toBeNull();
    expect(parseLapTime("99999999999999999999:00")).toBeNull();
    expect(parseLapTime("1:60")).toBeNull();
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
