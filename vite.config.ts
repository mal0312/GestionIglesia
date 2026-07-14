import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

declare const process: { env: { VITE_BASE_PATH?: string } };

function normalizeBasePath(basePath: string | undefined) {
  const trimmedBasePath = basePath?.trim();

  if (!trimmedBasePath) {
    return "/";
  }

  const withLeadingSlash = trimmedBasePath.startsWith("/")
    ? trimmedBasePath
    : `/${trimmedBasePath}`;

  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

export default defineConfig({
  base: normalizeBasePath(process.env.VITE_BASE_PATH),
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts"
  }
});
