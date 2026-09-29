import { defineConfig, exports } from "cf/config";

export default defineConfig({
  worker: {
    exports: {
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
