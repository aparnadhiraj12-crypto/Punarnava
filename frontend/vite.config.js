import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// NFR-3: full offline operation for 7 days. NFR-2: initial payload < 2MB.
// Tailwind v4 runs through its Vite plugin (no tailwind.config.js / postcss.config.js).
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "PUNARNAVA",
        short_name: "Punarnava",
        description: "A health record that never closes.",
        theme_color: "#245e4a",
        background_color: "#f5f0e6",
        display: "standalone",
        icons: [],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,ico,png,svg}"] },
    }),
  ],
});
