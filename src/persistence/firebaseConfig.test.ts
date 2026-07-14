import { describe, expect, it } from "vitest";
import { firebaseCredentialsFromEnv } from "./firebaseConfig";

describe("firebaseCredentialsFromEnv", () => {
  it("returns undefined when Firebase credentials are incomplete", () => {
    expect(
      firebaseCredentialsFromEnv({
        VITE_FIREBASE_API_KEY: "api-key",
        VITE_FIREBASE_PROJECT_ID: ""
      })
    ).toBeUndefined();
  });

  it("returns trimmed Firebase credentials when all required values exist", () => {
    expect(
      firebaseCredentialsFromEnv({
        VITE_FIREBASE_API_KEY: " api-key ",
        VITE_FIREBASE_APP_ID: " app-id ",
        VITE_FIREBASE_MESSAGING_SENDER_ID: " sender-id ",
        VITE_FIREBASE_PROJECT_ID: " project-id "
      })
    ).toEqual({
      apiKey: "api-key",
      appId: "app-id",
      messagingSenderId: "sender-id",
      projectId: "project-id"
    });
  });
});
