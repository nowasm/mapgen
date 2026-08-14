import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The workspace renderer and this app must share one Three.js instance.
    // Three's example passes rely on identity checks and can render a black
    // frame when pnpm links resolve a second copy from the renderer package.
    dedupe: ["three"],
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
  },
});
