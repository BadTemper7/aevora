import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Keep the Google OAuth popup connected to the Aevora window.
// Helmet on the API alone does not set headers on Vite's frontend HTML.
const popupHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    headers: popupHeaders,
    // Proxy authentication to Express while preserving the frontend origin.
    proxy: {
      "/api": "http://localhost:5000",
      "/socket.io": { target: "http://localhost:5000", ws: true, changeOrigin: true },
    },
  },
  preview: {
    headers: popupHeaders,
  },
});
