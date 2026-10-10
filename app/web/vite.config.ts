import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen 0.0.0.0 — จำเป็นเมื่อรันใน container
    port: 5173,
    // Docker Desktop บน Windows: bind mount ไม่ส่ง file event เข้า container → ต้อง polling
    watch: { usePolling: process.env.VITE_USE_POLLING === "true" },
    proxy: {
      "/api": process.env.API_URL ?? "http://localhost:3000",
    },
  },
});
