// Takes the built editor and the redesign's mockup at each of the mockup's moments, and writes one picture of
// each moment with the two side by side into docs/design/screenshots, for the owner to compare.
// Run it with `npm run build && node tests/redesign-screenshots/takeScreenshots.ts`.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';

type Moment = { file: string; mockupButton: string; arrange: (page: Page) => Promise<void> };

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MOCKUP = pathToFileURL(resolve(PROJECT, 'docs/design/mockups/redesign.html')).href;
const OUTPUT = resolve(PROJECT, 'docs/design/screenshots');
const PORT = 4175;
const EDITOR_URL = `http://localhost:${PORT}`;
const SERVER_TRIES = 100;
const SERVER_WAIT_MS = 100;
// The mockup is drawn for this window.
const WINDOW = { width: 1440, height: 900 };
// Big enough that the mockup's page shows its frame unscaled.
const MOCKUP_PAGE = { width: 1560, height: 1100 };
const SETTLE_MS = 400;

async function openMainMenuAt(page: Page, submenu: string) {
    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('menuitem', { name: submenu, exact: true }).hover();
}

async function freeMiddle(page: Page) {
    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');

    return { x: free.x + free.width / 2, y: free.y + free.height / 2 };
}

async function placeRectangle(page: Page, x: number, y: number) {
    await page.keyboard.press('4');
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 90, y + 50, { steps: 4 });
    await page.mouse.up();
}

// A level with something to select: the last shape placed stays selected, as Rectangle 3.
async function placeShapes(page: Page) {
    const middle = await freeMiddle(page);
    await placeRectangle(page, middle.x - 200, middle.y + 60);
    await placeRectangle(page, middle.x + 80, middle.y + 90);
    await placeRectangle(page, middle.x - 60, middle.y - 60);
}

const MOMENTS: Moment[] = [
    { file: 'selected-shape', mockupButton: 'A selected shape', arrange: placeShapes },
    {
        file: 'whole-level',
        mockupButton: 'The whole level',
        arrange: async (page) => {
            await placeShapes(page);
            await page.keyboard.press('Escape');
            await openMainMenuAt(page, 'View');
            await page.getByRole('menuitem', { name: /^Whole level/ }).click();
        },
    },
    {
        file: 'drawing',
        mockupButton: 'Drawing',
        arrange: async (page) => {
            const middle = await freeMiddle(page);
            await page.keyboard.press('4');
            await page.mouse.move(middle.x - 60, middle.y - 40);
            await page.mouse.down();
            await page.mouse.move(middle.x + 60, middle.y + 40, { steps: 4 });
        },
    },
    {
        file: 'main-menu',
        mockupButton: 'The main menu',
        arrange: async (page) => {
            await placeShapes(page);
            await openMainMenuAt(page, 'Edit');
        },
    },
    {
        file: 'dialog',
        mockupButton: 'A dialog',
        arrange: async (page) => {
            await placeShapes(page);
            await openMainMenuAt(page, 'File');
            await page.getByRole('menuitem', { name: /^New/ }).click();
            await page.getByRole('dialog').waitFor();
        },
    },
    {
        file: 'test-play',
        mockupButton: 'Test play',
        arrange: async (page) => {
            await placeShapes(page);
            await page.keyboard.press('Control+Enter');
            await page.getByRole('button', { name: /^Stop/ }).waitFor();
        },
    },
];

async function editorPicture(browser: Browser, moment: Moment) {
    const page = await browser.newPage({ viewport: WINDOW });
    await page.goto(EDITOR_URL);
    await page.locator('.level-view-host canvas').waitFor();
    await moment.arrange(page);
    await page.waitForTimeout(SETTLE_MS);
    const picture = await page.screenshot();
    await page.close();

    return picture;
}

async function mockupPicture(browser: Browser, moment: Moment) {
    const page = await browser.newPage({ viewport: MOCKUP_PAGE });
    await page.goto(MOCKUP);
    await page.getByRole('button', { name: moment.mockupButton, exact: true }).click();
    await page.waitForTimeout(SETTLE_MS);
    const picture = await page.locator('#frame').screenshot();
    await page.close();

    return picture;
}

function pictureHtml(title: string, picture: Buffer) {
    const source = `data:image/png;base64,${picture.toString('base64')}`;

    return `<figure><figcaption>${title}</figcaption><img src="${source}"></figure>`;
}

async function sideBySide(browser: Browser, editor: Buffer, mockup: Buffer) {
    const page = await browser.newPage({ viewport: { width: 2 * WINDOW.width + 60, height: WINDOW.height + 60 } });
    await page.setContent(`<style>
        body { margin: 0; padding: 10px 20px; display: flex; gap: 20px; background: #000; color: #e4e8ef; font: 16px monospace; }
        figure { margin: 0; } figcaption { height: 30px; } img { display: block; width: ${WINDOW.width}px; }
    </style>${pictureHtml('The editor', editor)}${pictureHtml('The mockup', mockup)}`);
    const picture = await page.screenshot();
    await page.close();

    return picture;
}

async function waitForServer() {
    for (let tries = 0; tries < SERVER_TRIES; tries += 1) {
        const answered = await fetch(EDITOR_URL).then(
            (response) => response.ok,
            () => false,
        );
        if (answered) return;
        await new Promise((done) => setTimeout(done, SERVER_WAIT_MS));
    }
    throw new Error('The preview server did not start. Run `npm run build` first.');
}

async function takeScreenshots() {
    const vite = resolve(PROJECT, 'node_modules/vite/bin/vite.js');
    const server = spawn(process.execPath, [vite, 'preview', '--port', String(PORT), '--strictPort'], {
        cwd: PROJECT,
        stdio: 'ignore',
    });
    const browser = await chromium.launch();
    try {
        await waitForServer();
        await mkdir(OUTPUT, { recursive: true });
        for (const moment of MOMENTS) {
            const editor = await editorPicture(browser, moment);
            const mockup = await mockupPicture(browser, moment);
            await writeFile(resolve(OUTPUT, `${moment.file}.png`), await sideBySide(browser, editor, mockup));
        }
    } finally {
        await browser.close();
        server.kill();
    }
}

await takeScreenshots();
