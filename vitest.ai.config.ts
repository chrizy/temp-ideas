import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineWorkersConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    include: ["**/*.live.test.ts"],
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
    poolOptions: {
      workers: {
        // Live AI tests require Wrangler remote proxy session.
        remoteBindings: true,
        wrangler: { configPath: "./wrangler.jsonc" },
      },
    },
  },
});

