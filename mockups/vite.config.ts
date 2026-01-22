import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      cesium: path.resolve("./node_modules/cesium/Build/Cesium"),
    },
  },
  define: {
    CESIUM_BASE_URL: JSON.stringify("/cesium"),
  },
  server: {
    fs: {
      allow: ["."],
    },
  },
  build: {
    rollupOptions: {
      input: "./index.html",
    },
  },
});
