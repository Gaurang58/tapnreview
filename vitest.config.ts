import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit tests only. The API-level access tests need a live Supabase project and
// have their own config (vitest.access.config.ts, `npm run test:access`).
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
