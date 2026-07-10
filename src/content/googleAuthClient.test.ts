import { afterEach, describe, expect, it, vi } from "vitest";
import { browserGoogleAuthClient } from "./googleAuthClient";

type GoogleTokenClientConfig = {
  callback: (response: { access_token?: string }) => void;
};

type GoogleIdentityWindow = Window & {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient: (config: GoogleTokenClientConfig) => {
          requestAccessToken: (config: { prompt: string }) => void;
        };
      };
    };
  };
};

describe("browserGoogleAuthClient", () => {
  afterEach(() => {
    delete (window as GoogleIdentityWindow).google;
  });

  it("uses Google Identity Services and returns the verified profile email", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "google-client-id.apps.googleusercontent.com");
    vi.stubEnv("VITE_DEV_GOOGLE_SIGN_IN_EMAIL", "dev@example.com");

    let requestAccessToken: ReturnType<typeof vi.fn> | null = null;
    const initTokenClient = vi.fn((config: GoogleTokenClientConfig) => {
      requestAccessToken = vi.fn(() => {
        config.callback({ access_token: "google-access-token" });
      });

      return { requestAccessToken };
    });

    (window as GoogleIdentityWindow).google = {
      accounts: {
        oauth2: { initTokenClient }
      }
    };

    const fetchUserInfo = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ email: "editora@example.com", email_verified: true }),
          { headers: { "Content-Type": "application/json" } }
        )
    );
    vi.stubGlobal("fetch", fetchUserInfo);

    await expect(browserGoogleAuthClient.signIn()).resolves.toEqual({
      email: "editora@example.com"
    });

    expect(initTokenClient).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "google-client-id.apps.googleusercontent.com",
        scope: "openid email profile",
        callback: expect.any(Function),
        error_callback: expect.any(Function)
      })
    );
    expect(requestAccessToken).toHaveBeenCalledWith({ prompt: "select_account" });
    expect(fetchUserInfo).toHaveBeenCalledWith(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: "Bearer google-access-token" } }
    );
  });
});
