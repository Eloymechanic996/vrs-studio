import { beforeAll, describe, expect, it, vi } from "vitest";

// Sin red: el envío falla como "sin conexión" y todo se queda en la cola.
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => {
    throw new Error("Sin conexión");
  },
}));

const store = new Map<string, string>();

beforeAll(() => {
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal("window", { addEventListener: () => {} });
  vi.stubGlobal("navigator", { onLine: false });
});

function lapOp(id: string) {
  return {
    kind: "lap" as const,
    id,
    sessionId: "s",
    createdAt: "",
    lapTimeMs: 60000,
    totalTimeMs: 60000,
    trackState: "Green Flag" as const,
    notes: null,
    sectors: null,
  };
}

describe("cola sin conexión con dos pestañas", () => {
  it("lo que guarda otra pestaña no se pierde al añadir una vuelta aquí", async () => {
    const { enqueue } = await import("./outbox");
    enqueue(lapOp("A1"));
    // Otra pestaña, con su propia copia, añade B1 al almacenamiento.
    const saved = JSON.parse(store.get("vrs:outbox:v1") ?? "[]");
    store.set("vrs:outbox:v1", JSON.stringify([...saved, lapOp("B1")]));
    enqueue(lapOp("A2"));
    const ids = JSON.parse(store.get("vrs:outbox:v1") ?? "[]").map((o: { id: string }) => o.id);
    expect(ids).toEqual(["A1", "B1", "A2"]);
  });
});
