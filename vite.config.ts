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
      includeAssets: ["favicon.svg", "robots.txt", "icons/icon-main.svg"],
      manifest: {
        name: "Famtastic",
        short_name: "Famtastic",
        description:
          "A warm, reliable family coordination app for duties, devotions, meals, shopping, and reminders.",
        theme_color: "#faf5ed",
        background_color: "#f7f2e8",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-main.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any"
          },
          {
            src: "/icons/icon-maskable.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable"
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
