import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

// The determinism page's own build, kept out of the game's dist/ so the two builds Playwright starts at once
// never empty each other's folder.
export default defineConfig({
    root: fileURLToPath(new URL('.', import.meta.url)),
    build: {
        outDir: fileURLToPath(new URL('../../../dist-determinism-page', import.meta.url)),
        emptyOutDir: true,
    },
});
