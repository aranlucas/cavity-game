import type { E2EConfig } from "e2e";
import { web } from "@e2e-dev/web";

export default {
  tests: "tests/**/*.e2e.ts",
  targets: [
    {
      name: "chromium",
      engine: web({ viewport: { width: 960, height: 720 } }),
      app: {
        url: "http://127.0.0.1:5173",
        command: {
          executable: "pnpm",
          args: [
            "--filter",
            "@cavity-rush/client",
            "exec",
            "vite",
            "--host",
            "127.0.0.1",
            "--strictPort",
          ],
          log: ".e2e/logs/app.log",
        },
      },
    },
  ],
  workers: 1,
  retries: 0,
  timeout: 1_200_000,
  assertionTimeout: 60_000,
  actionTimeout: 120_000,
  trace: "retain-on-failure",
  reporters: ["list", "junit"],
} satisfies E2EConfig;
