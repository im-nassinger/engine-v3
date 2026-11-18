import { defineConfig, devices } from '@playwright/test';

const PREVIEW_PORT = 4173;
// The determinism page's own server, for the phone checks (tests/e2e/phone).
const DETERMINISM_PAGE_PORT = 4174;
const DETERMINISM_PAGE_CONFIG = 'tests/determinism/page/vite.config.ts';
const PHONE_TESTS = 'phone/**';

export default defineConfig({
    testDir: 'tests/e2e',
    forbidOnly: Boolean(process.env.CI),
    // CI splits these tests across machines. Each keeps a blob report, and the journeys-report job joins
    // them into the HTML report, with the layout checks' screenshots attached.
    reporter: process.env.CI ? [['list'], ['blob']] : 'list',
    use: {
        baseURL: `http://localhost:${PREVIEW_PORT}`,
    },
    projects: [
        { name: 'chromium', testIgnore: PHONE_TESTS, use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', testIgnore: PHONE_TESTS, use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', testIgnore: PHONE_TESTS, use: { ...devices['Desktop Safari'] } },
        // The phone checks: a phone's size and engine, since a test can't reach a real phone (performance.md).
        { name: 'phone-chromium', testMatch: PHONE_TESTS, use: { ...devices['Pixel 7'] } },
        { name: 'phone-webkit', testMatch: PHONE_TESTS, use: { ...devices['iPhone 15'] } },
    ],
    webServer: [
        {
            command: `npm run build && npx vite preview --port ${PREVIEW_PORT} --strictPort`,
            url: `http://localhost:${PREVIEW_PORT}`,
            reuseExistingServer: !process.env.CI,
        },
        {
            command: `npx vite build --config ${DETERMINISM_PAGE_CONFIG} && npx vite preview --config ${DETERMINISM_PAGE_CONFIG} --port ${DETERMINISM_PAGE_PORT} --strictPort`,
            url: `http://localhost:${DETERMINISM_PAGE_PORT}`,
            reuseExistingServer: !process.env.CI,
        },
    ],
});
