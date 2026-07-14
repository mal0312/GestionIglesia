import { describe, expect, it, vi } from "vitest";
import type { Firestore, DocumentData } from "firebase/firestore";

const mockDoc = vi.hoisted(() => vi.fn());
const mockGetDoc = vi.hoisted(() => vi.fn());
const mockSetDoc = vi.hoisted(() => vi.fn());
const mockDocSnap = vi.hoisted(() => vi.fn());

vi.mock("firebase/firestore", () => ({
  doc: mockDoc,
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  DocumentReference: class {},
  DocumentSnapshot: mockDocSnap
}));

import { firestoreNewsPersistenceService } from "./firestoreNewsPersistenceService";
import type { NewsPublication } from "../domain/siteContent";

const fakeFirestore = {} as Firestore;

function buildService() {
  return firestoreNewsPersistenceService(fakeFirestore, "test-doc-id");
}

describe("firestoreNewsPersistenceService", () => {
  it("returns an empty list when the Firestore document does not exist", async () => {
    mockGetDoc.mockResolvedValue({
      exists: vi.fn(() => false)
    });

    const service = buildService();
    await expect(service.getAll()).resolves.toEqual([]);
  });

  it("returns the news array from the Firestore document", async () => {
    const news: NewsPublication[] = [
      {
        id: "noticia-1",
        title: "Test",
        summary: "Sum",
        body: "Body",
        status: "draft"
      }
    ];

    mockGetDoc.mockResolvedValue({
      exists: vi.fn(() => true),
      data: vi.fn(() => ({ items: news }))
    });

    const service = buildService();
    await expect(service.getAll()).resolves.toEqual(news);
  });

  it("replaces the full news list via setDoc", async () => {
    const news: NewsPublication[] = [
      {
        id: "noticia-2",
        title: "Replace",
        summary: "Sum",
        body: "Body",
        status: "published"
      }
    ];

    mockGetDoc.mockResolvedValue({
      exists: vi.fn(() => true),
      data: vi.fn(() => ({ items: news }))
    });

    const service = buildService();
    await service.replaceAll(news);

    expect(mockSetDoc).toHaveBeenCalledWith(
      undefined,
      { items: news },
      { merge: true }
    );

    const all = await service.getAll();
    expect(all).toEqual(news);
  });

  it("does not write to Firestore when the news list has not changed", async () => {
    const news: NewsPublication[] = [
      {
        id: "noticia-sin-cambios",
        title: "Sin cambios",
        summary: "Resumen igual.",
        body: "Cuerpo igual.",
        status: "published"
      }
    ];

    mockGetDoc.mockResolvedValue({
      exists: vi.fn(() => true),
      data: vi.fn(() => ({ items: news }))
    });

    const service = buildService();
    await service.getAll();
    await service.replaceAll(news);

    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});
