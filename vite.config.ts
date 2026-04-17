import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    target: "chrome110",
    cssTarget: "chrome110",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react-core";
          }

          if (id.includes("node_modules/react-router-dom") || id.includes("node_modules/react-router")) {
            return "router";
          }

          if (id.includes("node_modules/date-fns")) {
            return "date-utils";
          }

          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }

          if (id.includes("node_modules/@supabase")) {
            return "supabase";
          }

          return undefined;
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      includeAssets: [
        "favicon.svg",
        "robots.txt",
        "icons/icon-main.svg",
        "icons/icon-maskable.svg",
        "icons/pwa-192.png",
        "icons/pwa-512.png",
        "icons/maskable-512.png",
        "icons/apple-touch-icon-180.png"
      ],
      manifest: {
        id: "/",
        name: "Famtastic",
        short_name: "Famtastic",
        description:
          "A warm, reliable family coordination app for duties, devotions, meals, shopping, and reminders.",
        theme_color: "#faf5ed",
        background_color: "#f7f2e8",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone", "browser"],
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icons/pwa-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/pwa-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/icons/icon-main.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any"
          }
        ]
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,json}"]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
