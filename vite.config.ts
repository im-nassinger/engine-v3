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
