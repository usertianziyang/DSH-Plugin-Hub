import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path defaults to "/" (domain root). Set VITE_BASE to deploy under a
// sub-path, e.g. VITE_BASE=/my-app/ npm run build.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? "/",
});
