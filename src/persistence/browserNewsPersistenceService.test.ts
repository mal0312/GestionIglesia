import { describe, expect, it } from "vitest";
import { browserNewsPersistenceService } from "./browserNewsPersistenceService";

describe("browserNewsPersistenceService", () => {
  it("does not create a Firebase-backed service without complete credentials", () => {
    expect(browserNewsPersistenceService({ env: {} })).toBeUndefined();
  });
});
