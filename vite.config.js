import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      injectRegister: "auto",

      manifest: {
        name: "FlexiOrder",

        short_name: "FlexiOrder",

        start_url: "/",

        display: "standalone",

        background_color: "#0F172A",

        theme_color: "#F97316",

        icons: [
          {
            src: "/icon-192.jpg",
            sizes: "192x192",
            type: "image/jpg",
          },

          {
            src: "/icon512.jpg",
            sizes: "512x512",
            type: "image/jpg",
          },
        ],
      },

      workbox: {
        globPatterns: [
          "**/*.{js,css,html,png,svg,ico}",
        ],
      },
    }),
  ],
});