import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import manifest from "./manifest.config";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      "@": resolve(rootDir, "src"),
      "ezrevenue-sdk": resolve(rootDir, "vendor/ezrevenue-sdk/background.js"),
    },
  },
  server: {
    cors: {
      origin: [/chrome-extension:\/\//, /moz-extension:\/\//],
    },
  },
});
