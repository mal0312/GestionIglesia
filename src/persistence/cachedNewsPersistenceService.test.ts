import { describe, expect, it, vi } from "vitest";
import { cachedNewsPersistenceService } from "./cachedNewsPersistenceService";
import type { NewsPublication } from "../domain/siteContent";

function memoryStorage(initialValues: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initialValues));

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    }
  };
}

describe("cachedNewsPersistenceService", () => {
  it("returns fresh cached news without reading the remote service", async () => {
    const cachedNews: NewsPublication[] = [
      {
        id: "noticia-cache",
        title: "Desde cache",
        summary: "Resumen cacheado.",
        body: "Cuerpo cacheado.",
        status: "published"
      }
    ];
    const remoteService = {
      getAll: vi.fn(async () => [] as NewsPublication[]),
      replaceAll: vi.fn(async (_news: NewsPublication[]) => {})
    };
    const service = cachedNewsPersistenceService(remoteService, {
      cacheKey: "news-cache",
      currentTime: () => 1_000,
      storage: memoryStorage({
        "news-cache": JSON.stringify({ savedAt: 900, items: cachedNews })
      }),
      ttlMs: 200
    });

    await expect(service.getAll()).resolves.toEqual(cachedNews);
    expect(remoteService.getAll).not.toHaveBeenCalled();
  });

  it("coalesces concurrent cache misses into one remote read", async () => {
    const remoteNews: NewsPublication[] = [
      {
        id: "noticia-remota",
        title: "Desde Firestore",
        summary: "Resumen remoto.",
        body: "Cuerpo remoto.",
        status: "published"
      }
    ];
    const remoteService = {
      getAll: vi.fn(async () => remoteNews),
      replaceAll: vi.fn(async (_news: NewsPublication[]) => {})
    };
    const service = cachedNewsPersistenceService(remoteService, {
      cacheKey: "news-cache",
      currentTime: () => 1_000,
      storage: memoryStorage(),
      ttlMs: 200
    });

    const [firstResult, secondResult] = await Promise.all([service.getAll(), service.getAll()]);

    expect(firstResult).toEqual(remoteNews);
    expect(secondResult).toEqual(remoteNews);
    expect(remoteService.getAll).toHaveBeenCalledTimes(1);
  });
});
