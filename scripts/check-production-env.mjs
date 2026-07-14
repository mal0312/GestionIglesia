const requiredVariables = [
  [
    "VITE_AUTHORIZED_EDITOR_EMAILS",
    "Email allowlist for Editor accounts that can enter the private panel."
  ],
  [
    "VITE_AUTHORIZED_ADMIN_EMAILS",
    "Email allowlist for Administrador accounts that can approve and publish."
  ],
  ["VITE_GOOGLE_CLIENT_ID", "Google OAuth web client id for production sign-in."],
  [
    "VITE_GOOGLE_APPS_SCRIPT_EMAIL_ENDPOINT",
    "Google Apps Script endpoint used by public contact forms."
  ],
  ["VITE_FIREBASE_API_KEY", "Firebase web app apiKey for Firestore content storage."],
  ["VITE_FIREBASE_PROJECT_ID", "Firebase project id for Firestore content storage."],
  ["VITE_FIREBASE_APP_ID", "Firebase web app appId for Firestore content storage."]
];

const missingVariables = requiredVariables.filter(
  ([name]) => !process.env[name]?.trim()
);
const endpoint = process.env.VITE_GOOGLE_APPS_SCRIPT_EMAIL_ENDPOINT?.trim() ?? "";
const developmentEmail = process.env.VITE_DEV_GOOGLE_SIGN_IN_EMAIL?.trim() ?? "";
const endpointError = validateHttpsUrl(endpoint);

if (missingVariables.length > 0 || developmentEmail || endpointError) {
  console.error("Production deployment configuration is incomplete.");

  if (missingVariables.length > 0) {
    console.error("\nMissing variables:");
    for (const [name, description] of missingVariables) {
      console.error(`- ${name}: ${description}`);
    }
  }

  if (developmentEmail) {
    console.error(
      "\nRemove VITE_DEV_GOOGLE_SIGN_IN_EMAIL before production builds; it is a development-only sign-in double."
    );
  }

  if (endpointError) {
    console.error(`\n${endpointError}`);
  }

  process.exit(1);
}

console.log("Production deployment environment is configured.");

function validateHttpsUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      return "VITE_GOOGLE_APPS_SCRIPT_EMAIL_ENDPOINT must use https.";
    }
  } catch {
    return "VITE_GOOGLE_APPS_SCRIPT_EMAIL_ENDPOINT must be a valid URL.";
  }

  return null;
}
