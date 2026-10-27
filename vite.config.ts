import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  publicDir: false,
  build: { target: "es2022", assetsInlineLimit: 10000000 },
});
