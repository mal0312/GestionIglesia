import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

export type FirebaseCredentials = {
  apiKey: string;
  messagingSenderId?: string;
  projectId: string;
  appId: string;
};

export type FirebaseEnvironment = {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
};

export function firebaseCredentialsFromEnv(
  env: FirebaseEnvironment = import.meta.env
): FirebaseCredentials | undefined {
  const apiKey = env.VITE_FIREBASE_API_KEY?.trim() ?? "";
  const appId = env.VITE_FIREBASE_APP_ID?.trim() ?? "";
  const projectId = env.VITE_FIREBASE_PROJECT_ID?.trim() ?? "";

  if (!apiKey || !appId || !projectId) {
    return undefined;
  }

  return {
    apiKey,
    appId,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    projectId
  };
}

export function firebaseApp(credentials?: FirebaseCredentials) {
  const creds = credentials ?? firebaseCredentialsFromEnv();

  if (!creds) {
    throw new Error("Missing Firebase configuration.");
  }

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    apiKey: creds.apiKey,
    authDomain: `${creds.projectId}.firebaseapp.com`,
    messagingSenderId: creds.messagingSenderId ?? "",
    projectId: creds.projectId,
    storageBucket: `${creds.projectId}.appspot.com`,
    appId: creds.appId
  });
}

export function firestore(app: ReturnType<typeof initializeApp>) {
  return getFirestore(app);
}
