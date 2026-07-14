import type { NewsPersistenceService } from "./NewsPersistenceService";
import { cachedNewsPersistenceService } from "./cachedNewsPersistenceService";
import { firebaseApp, firebaseCredentialsFromEnv, firestore } from "./firebaseConfig";
import type { FirebaseEnvironment } from "./firebaseConfig";
import { firestoreNewsPersistenceService } from "./firestoreNewsPersistenceService";

const newsCacheKey = "gestion-iglesia:news:v1";
const newsCacheTtlMs = 5 * 60 * 1000;

type BrowserNewsPersistenceOptions = {
  currentTime?: () => number;
  env?: FirebaseEnvironment;
  storage?: Storage;
  ttlMs?: number;
};

function browserLocalStorage(): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function browserNewsPersistenceService({
  currentTime,
  env = import.meta.env,
  storage = browserLocalStorage(),
  ttlMs = newsCacheTtlMs
}: BrowserNewsPersistenceOptions = {}): NewsPersistenceService | undefined {
  const credentials = firebaseCredentialsFromEnv(env);
  if (!credentials) {
    return undefined;
  }

  const remoteService = firestoreNewsPersistenceService(firestore(firebaseApp(credentials)));
  if (!storage) {
    return remoteService;
  }

  return cachedNewsPersistenceService(remoteService, {
    cacheKey: newsCacheKey,
    currentTime,
    storage,
    ttlMs
  });
}
