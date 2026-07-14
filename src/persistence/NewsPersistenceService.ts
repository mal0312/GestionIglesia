import type { NewsPublication } from "../domain/siteContent";

export type NewsPersistenceService = {
  getAll(): Promise<NewsPublication[]>;
  replaceAll(news: NewsPublication[]): Promise<void>;
};
