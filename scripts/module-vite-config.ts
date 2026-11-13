import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export function defineModuleConfig(configUrl: string) {
  return defineConfig({
    plugins: [react()],
    build: {
      lib: {
        entry: fileURLToPath(new URL("./src/index.ts", configUrl)),
        formats: ["es"],
        fileName: "index",
      },
      sourcemap: true,
      rollupOptions: {
        external: (id) => ["react", "react-dom", "ai", "zod", "@tablette/module-sdk", "@hackeindhoven/module-contracts"]
          .some((name) => id === name || id.startsWith(`${name}/`)),
      },
    },
  });
}
