import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const devAllowedHost = process.env.VITE_DEV_ALLOWED_HOST || "localhost";
const devApiTarget = process.env.VITE_DEV_API_TARGET || "http://localhost:4001";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    sourcemap: true,
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
