import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const reactCompiler = reactCompilerPreset();

// The speed tests draw with the GPU where there is one; CI's browsers fall back to drawing without it.
const GPU_ARGS = ['--enable-gpu', '--use-angle=gl', '--ignore-gpu-blocklist'];
const PERFORMANCE_TESTS = 'tests/performance/**/*.browser.test.ts';

export default defineConfig({
    plugins: [react(), babel({ presets: [reactCompiler] })],
    server: {
        // One address for the dev server: a second `npm run dev` stops with "Port 5173 is already in use"
        // instead of moving to 5174 while the tab keeps showing the old server.
        port: 5173,
        strictPort: true,
        // A file being saved can be empty for a moment. Without this the server can read it then, and keep
        // serving the empty copy until the file changes again (it did with EditorShell.css on 2026-11-18).
        watch: { awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 50 } },
    },
    test: {
        projects: [
            {
                extends: true,
                test: {
                    name: 'node',
                    include: [
                        'src/**/*.test.ts',
                        'tests/guards/**/*.test.ts',
                        'tests/levels/**/*.test.ts',
                        'tests/determinism/**/*.test.ts',
                    ],
                    exclude: ['**/*.browser.test.ts', '**/node_modules/**'],
                    environment: 'node',
                },
            },
            {
                extends: true,
                test: {
                    name: 'browser',
                    include: ['**/*.browser.test.ts'],
                    exclude: ['**/node_modules/**', PERFORMANCE_TESTS],
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright(),
                        instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }],
                    },
                },
            },
            {
                extends: true,
                test: {
                    name: 'performance',
                    include: [PERFORMANCE_TESTS],
                    // One test at a time in one browser, so nothing else competes for the processor.
                    fileParallelism: false,
                    // CI draws without a GPU: a test waits for each frame's drawing, about 0.5 s there.
                    testTimeout: 180_000,
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright({ launchOptions: { args: GPU_ARGS } }),
                        instances: [{ browser: 'chromium' }],
                    },
                },
            },
        ],
    },
});
