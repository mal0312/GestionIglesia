import type { NewsPublication } from "../domain/siteContent";
import type { NewsPersistenceService } from "./NewsPersistenceService";

type CacheOptions = {
  cacheKey: string;
  currentTime?: () => number;
  storage: Storage;
  ttlMs: number;
};

type NewsCacheEntry = {
  items: NewsPublication[];
  savedAt: number;
};

function readCache(storage: Storage, cacheKey: string): NewsCacheEntry | null {
  try {
    const raw = storage.getItem(cacheKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<NewsCacheEntry>;
    if (!Array.isArray(parsed.items) || typeof parsed.savedAt !== "number") {
      storage.removeItem(cacheKey);
      return null;
    }

    return { items: parsed.items as NewsPublication[], savedAt: parsed.savedAt };
  } catch {
    try {
      storage.removeItem(cacheKey);
    } catch {
      // Ignore unavailable browser storage; Firestore remains the source of truth.
    }
    return null;
  }
}

function writeCache(
  storage: Storage,
  cacheKey: string,
  items: NewsPublication[],
  savedAt: number
) {
  try {
    storage.setItem(cacheKey, JSON.stringify({ items, savedAt }));
  } catch {
    try {
      storage.removeItem(cacheKey);
    } catch {
      // Ignore unavailable browser storage; Firestore remains the source of truth.
    }
  }
}

export function cachedNewsPersistenceService(
  remoteService: NewsPersistenceService,
  {
    cacheKey,
    currentTime = () => Date.now(),
    storage,
    ttlMs
  }: CacheOptions
): NewsPersistenceService {
  let inFlightGetAll: Promise<NewsPublication[]> | null = null;

  return {
    async getAll() {
      const cached = readCache(storage, cacheKey);
      const now = currentTime();

      if (cached && now - cached.savedAt <= ttlMs) {
        return cached.items;
      }

      if (!inFlightGetAll) {
        inFlightGetAll = remoteService
          .getAll()
          .then((items) => {
            writeCache(storage, cacheKey, items, now);
            return items;
          })
          .finally(() => {
            inFlightGetAll = null;
          });
      }

      return inFlightGetAll;
    },

    async replaceAll(news) {
      await remoteService.replaceAll(news);
      writeCache(storage, cacheKey, news, currentTime());
    }
  };
}
