import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },

  test: {
    include: ["test/**/*.test.mjs"],
    environment: "node",
    fileParallelism: false,
    maxWorkers: 1,
  },
});
