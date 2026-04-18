import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const target =
    (env.VITE_API_URL || "").trim().replace(/\/$/, "") ||
    "http://127.0.0.1:5000";

  return {
    root: __dirname,
    envDir: __dirname,
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          secure: true,
        },
        "/uploads": {
          target,
          changeOrigin: true,
          secure: true,
        },
        "/socket.io": {
          target,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
