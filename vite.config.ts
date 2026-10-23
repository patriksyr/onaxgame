import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: { target: "es2022" },
  server: {
    proxy: {
      "/api.php": "http://127.0.0.1:8080",
      "/uploads": "http://127.0.0.1:8080",
    },
  },
});
