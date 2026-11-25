import { beforeAll, describe, expect, it, vi } from "vitest";

// Servidor simulado: cada vuelta tarda un poco en guardarse y se apunta el orden.
const sent: string[] = [];
let onFirstSend: (() => void) | null = null;

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    rpc: async (_fn: string, args: { p_id: string }) => {
      sent.push(args.p_id);
      const hook = onFirstSend;
      onFirstSend = null;
      hook?.();
      await new Promise((r) => setTimeout(r, 5));
      return { error: null };
    },
  }),
}));

const store = new Map<string, string>();

beforeAll(() => {
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal("window", { addEventListener: () => {} });
  vi.stubGlobal("navigator", { onLine: true });
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

describe("envío de la cola", () => {
  it("una lista pegada sale entera y en orden, y lo añadido durante el envío no espera", async () => {
    const { enqueue, enqueueMany, flushOutbox } = await import("./outbox");
    // Mientras se envía la primera vuelta, el usuario marca otra.
    onFirstSend = () => enqueue(lapOp("D"));
    enqueueMany([lapOp("A"), lapOp("B"), lapOp("C")]);
    await flushOutbox();
    expect(sent).toEqual(["A", "B", "C", "D"]);
    const queue = JSON.parse(store.get("vrs:outbox:v1") ?? "[]") as { synced?: boolean }[];
    expect(queue.every((o) => o.synced)).toBe(true);
  });
});
