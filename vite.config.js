import { defineConfig } from "vite";

export default defineConfig({
  // publicDir: "public", // Defaults to public
  resolve: {
    alias: [
      { find: /^three$/, replacement: "three/src/Three.js" },
    ],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 560,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const moduleId = id.replace(/\\/g, "/");
          if (moduleId.includes("/node_modules/three/examples/")) {
            return "vendor-three-addons";
          }
          if (moduleId.includes("/node_modules/three/src/")) {
            return "vendor-three-core";
          }
          if (moduleId.includes("/node_modules/three/")) {
            return "vendor-three-core";
          }
          if (moduleId.includes("/node_modules/cannon-es/")) {
            return "vendor-physics";
          }
          if (moduleId.includes("/node_modules/")) {
            return "vendor";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    open: true,
  },
});
