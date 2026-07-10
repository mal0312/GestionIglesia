import type { GoogleAccount, GoogleAuthClient } from "../domain/auth";

const googleUserInfoEndpoint = "https://www.googleapis.com/oauth2/v3/userinfo";
const googleSignInScope = "openid email profile";
const googleIdentityServicesTimeoutMs = 5000;

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenClientError = {
  message?: string;
  type?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (config: { prompt: string }) => void;
};

type GoogleOAuth2 = {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
    error_callback: (error: GoogleTokenClientError) => void;
  }) => GoogleTokenClient;
};

type GoogleIdentityWindow = Window & {
  google?: {
    accounts?: {
      oauth2?: GoogleOAuth2;
    };
  };
};

type GoogleProfile = {
  email?: unknown;
  email_verified?: unknown;
};

export const browserGoogleAuthClient: GoogleAuthClient = {
  async signIn() {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

    if (googleClientId) {
      return signInWithGoogleIdentityServices(googleClientId);
    }

    if (import.meta.env.DEV) {
      const configuredDevelopmentEmail = import.meta.env.VITE_DEV_GOOGLE_SIGN_IN_EMAIL?.trim();

      if (configuredDevelopmentEmail) {
        return { email: configuredDevelopmentEmail };
      }

      const enteredEmail = window.prompt(
        "Modo desarrollo: ingresa el email de Google que queres probar."
      );

      if (enteredEmail?.trim()) {
        return { email: enteredEmail.trim() };
      }
    }

    throw new Error("Google auth client is not configured");
  }
};

async function signInWithGoogleIdentityServices(clientId: string): Promise<GoogleAccount> {
  const googleOAuth2 = await waitForGoogleIdentityServices();
  const accessToken = await requestGoogleAccessToken(googleOAuth2, clientId);

  return fetchGoogleAccount(accessToken);
}

function waitForGoogleIdentityServices(): Promise<GoogleOAuth2> {
  const googleOAuth2 = getGoogleOAuth2();

  if (googleOAuth2) {
    return Promise.resolve(googleOAuth2);
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Identity Services script did not load"));
    }, googleIdentityServicesTimeoutMs);

    const interval = window.setInterval(() => {
      const loadedGoogleOAuth2 = getGoogleOAuth2();

      if (loadedGoogleOAuth2) {
        cleanup();
        resolve(loadedGoogleOAuth2);
      }
    }, 50);

    function cleanup() {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    }
  });
}

function getGoogleOAuth2() {
  return (window as GoogleIdentityWindow).google?.accounts?.oauth2 ?? null;
}

function requestGoogleAccessToken(
  googleOAuth2: GoogleOAuth2,
  clientId: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const tokenClient = googleOAuth2.initTokenClient({
      client_id: clientId,
      scope: googleSignInScope,
      callback(response) {
        if (response.error) {
          reject(new Error(response.error_description ?? response.error));
          return;
        }

        if (!response.access_token) {
          reject(new Error("Google did not return an access token"));
          return;
        }

        resolve(response.access_token);
      },
      error_callback(error) {
        reject(new Error(error.message ?? error.type ?? "Google sign-in failed"));
      }
    });

    tokenClient.requestAccessToken({ prompt: "select_account" });
  });
}

async function fetchGoogleAccount(accessToken: string): Promise<GoogleAccount> {
  const response = await fetch(googleUserInfoEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error("Could not read Google profile");
  }

  const profile = (await response.json()) as GoogleProfile;

  if (profile.email_verified !== true) {
    throw new Error("Google account email is not verified");
  }

  if (typeof profile.email !== "string" || !profile.email.trim()) {
    throw new Error("Google profile did not include an email");
  }

  return { email: profile.email.trim() };
}
