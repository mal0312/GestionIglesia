import { doc, getDoc, setDoc } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import type { NewsPersistenceService } from "./NewsPersistenceService";
import type { NewsPublication } from "../domain/siteContent";

const defaultDocId = "gestion-noticias";

export function firestoreNewsPersistenceService(
  firestore: Firestore,
  docId: string = defaultDocId
): NewsPersistenceService {
  const newsDoc = doc(firestore, "gestion", docId);
  let lastSerializedNews: string | null = null;

  return {
    async getAll(): Promise<NewsPublication[]> {
      const snapshot = await getDoc(newsDoc);

      if (!snapshot.exists()) {
        lastSerializedNews = JSON.stringify([]);
        return [];
      }

      const data = snapshot.data();
      const items = Array.isArray(data?.items) ? (data.items as NewsPublication[]) : [];
      lastSerializedNews = JSON.stringify(items);
      return items;
    },

    async replaceAll(news: NewsPublication[]): Promise<void> {
      const serializedNews = JSON.stringify(news);
      if (serializedNews === lastSerializedNews) {
        return;
      }

      await setDoc(newsDoc, { items: news }, { merge: true });
      lastSerializedNews = serializedNews;
    }
  };
}
