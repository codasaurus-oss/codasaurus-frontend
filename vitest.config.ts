import { mergeConfig } from "vite"
import { defineConfig } from "vitest/config"

import viteConfig from "./vite.config.ts"

export default defineConfig(
  mergeConfig(viteConfig, {
    test: {
      environment: "jsdom",
      setupFiles: "./src/tests/setup.ts",
    },
  })
)
