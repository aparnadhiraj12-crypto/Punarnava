import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// NFR-3: full offline operation for 7 days. NFR-2: initial payload < 2MB.
// The PWA plugin gives us the service worker + manifest; IndexedDB-backed
// sync (see src/store/offlineStore.js) is what actually makes the mother
// and ASHA views usable with no network.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "PUNARNAVA",
        short_name: "Punarnava",
        description: "A health record that never closes.",
        theme_color: "#7c3f58",
        background_color: "#fdf8f4",
        display: "standalone",
        icons: [],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
});
