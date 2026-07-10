export type UserRole = "editor" | "admin";

export type RoleCapability =
  | "prepare_content"
  | "approve_content"
  | "reject_content"
  | "publish_content"
  | "archive_content";

export type AuthorizedAccount = {
  email: string;
  role: UserRole;
  active: boolean;
};

export type AuthConfig = {
  authorizedAccounts: AuthorizedAccount[];
};

export type GoogleAccount = {
  email: string;
};

export type AuthenticatedUser = {
  email: string;
  role: UserRole;
};

export type GoogleAuthClient = {
  signIn: () => Promise<GoogleAccount>;
};

const capabilitiesByRole: Record<UserRole, RoleCapability[]> = {
  editor: ["prepare_content"],
  admin: [
    "prepare_content",
    "approve_content",
    "reject_content",
    "publish_content",
    "archive_content"
  ]
};

export const roleLabels: Record<UserRole, string> = {
  editor: "Editor",
  admin: "Administrador"
};

export function authorizeGoogleAccount(
  account: GoogleAccount,
  config: AuthConfig
): AuthenticatedUser | null {
  const email = normalizeEmail(account.email);
  const authorizedAccount = config.authorizedAccounts.find(
    (candidate) => normalizeEmail(candidate.email) === email && candidate.active
  );

  if (!authorizedAccount) {
    return null;
  }

  return {
    email: authorizedAccount.email,
    role: authorizedAccount.role
  };
}

export function can(role: UserRole, capability: RoleCapability) {
  return capabilitiesByRole[role].includes(capability);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
