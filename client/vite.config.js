import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Always treat `client/` as the project root so `.env` loads even if you run Vite from the monorepo root.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const rawTarget = (env.VITE_API_URL || "").trim().replace(/\/$/, "");
  const target =
    rawTarget.replace(
      /(^https?:\/\/)0\.0\.0\.0(?=:|\/|$)/i,
      (_, scheme) => `${scheme}127.0.0.1`,
    ) || "http://127.0.0.1:5000";

  return {
    root: __dirname,
    envDir: __dirname,
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["pwa-192.png", "pwa-512.png"],
        // Dev: Workbox-generated SW + Vite 7 can hit "Source phase import ... _version.js"
        // errors; production build is unaffected. Test install via `npm run build && npm run preview`.
        devOptions: {
          enabled: false,
        },
        manifest: {
          id: "/",
          name: "TableTab",
          short_name: "TableTab",
          description: "Order at your table — fast menu and checkout.",
          theme_color: "#07090e",
          background_color: "#07090e",
          display: "standalone",
          orientation: "portrait-primary",
          scope: "/",
          start_url: "/",
          lang: "en",
          icons: [
            {
              src: "pwa-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "pwa-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "pwa-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
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
      port: 5172,
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
