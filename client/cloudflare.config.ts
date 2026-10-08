import { defineConfig, exports } from "cf/config";

export default defineConfig({
  worker: {
    exports: {
      // Retire the former multiplayer namespace without a Worker entrypoint.
      GameRoom: exports.durableObject({ state: "deleted" }),
    },
    name: "cavity-rush",
    compatibilityDate: "2026-07-09",
    observability: {
      enabled: true,
      headSamplingRate: 1,
    },
    assets: {
      notFoundHandling: "single-page-application",
    },
  },
});
