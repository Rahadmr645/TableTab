import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeProxyTarget(url) {
  const u = (url || "").trim().replace(/\/$/, "");
  if (!u) return "http://127.0.0.1:5000";
  return u.replace(
    /(^https?:\/\/)0\.0\.0\.0(?=:|\/|$)/i,
    (_, scheme) => `${scheme}127.0.0.1`,
  );
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const target = normalizeProxyTarget(env.VITE_API_URL);

  return {
    root: __dirname,
    envDir: __dirname,
    plugins: [react()],
    resolve: {
      alias: {
        "@shared": path.resolve(__dirname, "../shared"),
        "html2pdf.js": path.resolve(__dirname, "node_modules/html2pdf.js"),
        qrcode: path.resolve(__dirname, "node_modules/qrcode"),
        react: path.resolve(__dirname, "node_modules/react"),
        "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
        "react/jsx-runtime": path.resolve(
          __dirname,
          "node_modules/react/jsx-runtime.js",
        ),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      fs: {
        allow: [path.resolve(__dirname), path.resolve(__dirname, "..")],
      },
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
