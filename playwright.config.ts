import { defineConfig, devices } from '@playwright/test';

const PREVIEW_PORT = 4173;

export default defineConfig({
    testDir: 'tests/e2e',
    forbidOnly: Boolean(process.env.CI),
    use: {
        baseURL: `http://localhost:${PREVIEW_PORT}`,
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    ],
    webServer: {
        command: `npm run build && npx vite preview --port ${PREVIEW_PORT} --strictPort`,
        url: `http://localhost:${PREVIEW_PORT}`,
        reuseExistingServer: !process.env.CI,
    },
});
