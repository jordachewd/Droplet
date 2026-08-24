import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
    globals: true,
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    setupFiles: ["./tests/unit/vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      exclude: [
        "src/components/chat/chat-body.tsx",
        "src/components/shared/image-holder.tsx",
        "src/lib/utils/admin-queries.ts",
        "src/lib/utils/openai/generateResponse.tsx",
        "src/lib/utils/openai/message-policy.ts",
        "src/lib/utils/aws/getFileFromAWS.tsx",
      ],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(process.cwd(), "src"),
      "server-only": resolve(
        process.cwd(),
        "tests/unit/test-support/server-only.ts",
      ),
    },
  },
});
