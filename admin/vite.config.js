import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
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
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["pwa-192.png", "pwa-512.png"],
        devOptions: {
          enabled: true,
          type: "module",
        },
        manifest: {
          id: "/",
          name: "TableTab Admin",
          short_name: "TableTab Admin",
          description: "TableTab Admin dashboard for order fulfillment and analytics.",
          theme_color: "#0f172a",
          background_color: "#0f172a",
          display: "standalone",
          orientation: "any",
          scope: "/",
          start_url: "/",
          lang: "en",
          icons: [
            {
              src: "/pwa-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: mode === "production" ? ["**/*.{js,css,html,ico,png,svg,woff2}"] : [],
          navigateFallbackDenylist: [/^\/api\//],
        },
      }),
    ],
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
