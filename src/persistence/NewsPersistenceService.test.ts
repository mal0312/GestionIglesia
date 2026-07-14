import { describe, expect, it } from "vitest";
import type { NewsPersistenceService } from "./NewsPersistenceService";

describe("NewsPersistenceService contract", () => {
  function setupService(): NewsPersistenceService {
    const store = new Map<string, string>();
    return {
      async getAll() {
        const raw = store.get("news");
        return raw ? JSON.parse(raw) : [];
      },
      async replaceAll(news) {
        store.set("news", JSON.stringify(news));
      }
    };
  }

  it("returns an empty list when no news has been stored yet", async () => {
    const service = setupService();
    await expect(service.getAll()).resolves.toEqual([]);
  });

  it("persists a list of news publications and reads them back", async () => {
    const service = setupService();

    await service.replaceAll([
      {
        id: "noticia-1",
        title: "Culto de domingo",
        summary: "Resumen del culto.",
        body: "Cuerpo de la noticia.",
        status: "published"
      }
    ]);

    const all = await service.getAll();
    expect(all).toEqual([
      expect.objectContaining({
        id: "noticia-1",
        title: "Culto de domingo",
        summary: "Resumen del culto.",
        status: "published"
      })
    ]);
  });

  it("replaces the entire news array on successive replaceAll calls", async () => {
    const service = setupService();

    await service.replaceAll([
      { id: "1", title: "A", summary: "s1", body: "b1", status: "draft" },
      { id: "2", title: "B", summary: "s2", body: "b2", status: "draft" }
    ]);

    const first = await service.getAll();
    expect(first).toHaveLength(2);

    await service.replaceAll([
      { id: "3", title: "C", summary: "s3", body: "b3", status: "published" }
    ]);

    const second = await service.getAll();
    expect(second).toHaveLength(1);
    expect(second[0]!.id).toBe("3");
  });
});
