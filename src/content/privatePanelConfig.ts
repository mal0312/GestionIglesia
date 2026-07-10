import type { AuthConfig, UserRole } from "../domain/auth";

export const privatePanelAuthConfig: AuthConfig = {
  authorizedAccounts: [
    ...accountsFromEnv("editor", import.meta.env.VITE_AUTHORIZED_EDITOR_EMAILS),
    ...accountsFromEnv("admin", import.meta.env.VITE_AUTHORIZED_ADMIN_EMAILS)
  ]
};

function accountsFromEnv(role: UserRole, value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
    .map((email) => ({ email, role, active: true }));
}
