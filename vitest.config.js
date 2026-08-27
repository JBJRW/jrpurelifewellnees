import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["assets/*.js", "sw.js"],
      reporter: ["text", "lcov"],
    },
  },
});
