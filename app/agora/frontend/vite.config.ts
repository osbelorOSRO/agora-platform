import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// @ts-ignore — vitest types only available after install
/// <reference types="vitest" />

const devAllowedHost = process.env.VITE_DEV_ALLOWED_HOST || "localhost";
const devApiTarget = process.env.VITE_DEV_API_TARGET || "http://localhost:4001";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // @ts-ignore
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
    env: {
      VITE_API_URL: "http://localhost:4001",
      VITE_WEBSOCKET_URL: "ws://localhost:5050",
      VITE_MEDIA_BASE_URL: "http://localhost:4001",
      VITE_WA_PUBLIC_URL: "http://localhost:3000",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/test/**", "src/main.tsx", "src/**/*.d.ts"],
      thresholds: {
        lines: 15,
        functions: 10,
        branches: 12,
        statements: 15,
      },
    },
  },
  build: {
    sourcemap: process.env.VITE_BUILD_SOURCEMAP === "true",
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: [devAllowedHost],
    proxy: {
      "/api": {
        target: devApiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  base: "/",
});
