import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^src\//, replacement: `${src}/` },
      // The obsidian package ships types only; tests run against a stub.
      { find: /^obsidian$/, replacement: `${src}/ui/__mocks__/obsidian.ts` },
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/testUtils/setup.ts"],
    server: {
      deps: {
        // Bundle this dependency so its own `import "obsidian"` hits the stub.
        inline: ["obsidian-daily-notes-interface"],
      },
    },
  },
});
