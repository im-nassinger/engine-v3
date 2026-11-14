import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const reactCompiler = reactCompilerPreset();

export default defineConfig({
    plugins: [react(), babel({ presets: [reactCompiler] })],
    test: {
        projects: [
            {
                extends: true,
                test: {
                    name: 'node',
                    include: ['src/**/*.test.ts', 'tests/guards/**/*.test.ts'],
                    exclude: ['**/*.browser.test.ts', '**/node_modules/**'],
                    environment: 'node',
                },
            },
            {
                extends: true,
                test: {
                    name: 'browser',
                    include: ['**/*.browser.test.ts'],
                    exclude: ['**/node_modules/**'],
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright(),
                        instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }],
                    },
                },
            },
        ],
    },
});
