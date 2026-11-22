import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { zipSync } from 'fflate';

const MB = 1024 * 1024;
// Past the 256 MB a level holds unpacked, and still small once deflated.
const BOMB_UNPACKED_BYTES = 300 * MB;
// A lie the zip's directories tell about the unpacked size, so only the running count can stop it.
const BOMB_DECLARED_BYTES = 1000;
const TOO_BIG_TEXT = 'This file is too big: a level holds at most 256 MB';
const READ_ONLY_TEXT = 'The level is open in another tab';
const HANDED_OVER_TEXT =
    'The level is open in a newer tab, so this tab is read-only now. Your changes were saved first.';
const SAVE_FAILED_START = 'Saving in this browser failed';
const SAVED_TITLE = 'Untitled level - engine-v3';
const UNSAVED_TITLE = '*Untitled level - engine-v3';
// Long enough for a save after the 2 s quiet delay, and for the slowest browser on CI.
const SAVE_TIMEOUT_MS = 15_000;
// WebKit's download gives the name with its spaces turned into `_`; the page asked for `Untitled level.editable`.
const EXPORTED_NAME = /^Untitled[ _]level\.editable$/;

// Opens the editor and waits until the level view is in the page.
async function openEditor(page: Page) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Main menu' })).toBeVisible();
    await expect(page.locator('.level-view-host canvas')).toBeVisible();
}

// The tab title is the only place that shows unsaved changes: `*` in front of the name until a save.
async function expectSaved(page: Page) {
    await expect(page).toHaveTitle(SAVED_TITLE, { timeout: SAVE_TIMEOUT_MS });
}

function entityRow(page: Page, name: string) {
    return page.getByRole('tree', { name: 'Entities' }).getByRole('treeitem').filter({ hasText: name });
}

function statusText(page: Page) {
    return page.locator('.message-pill .message');
}

// A click with the Shape tool in the middle of the free area places a rectangle named `Rectangle 1`.
async function drawRectangle(page: Page) {
    const free = await page.locator('.free-area').boundingBox();
    if (!free) throw new Error('The free area has no size.');

    await page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Shape' }).click();
    await page.getByRole('group', { name: 'Kinds menu' }).getByRole('button', { name: 'Rectangle' }).click();
    await page.mouse.click(free.x + free.width / 2, free.y + free.height / 2);
    await expect(entityRow(page, 'Rectangle 1')).toBeVisible();
}

async function runFileCommand(page: Page, label: string) {
    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('menuitem', { name: 'File', exact: true }).hover();
    await page.getByRole('menuitem', { name: new RegExp(`^${label}`) }).click();
}

async function answerReplace(page: Page) {
    const question = page.getByRole('dialog');
    await expect(question).toContainText('Replace the open level?');
    await question.getByRole('button', { name: 'Replace' }).click();
}

// Drops a file on the page and answers Replace. A drop, not Import's file dialog: Playwright's Firefox fires the file
// input's `cancel` before the `change` that carries the file, so the picker gives nothing (see tech-notes.md).
async function dropFile(page: Page, file: { name: string; bytes: Buffer }) {
    const transfer = await page.evaluateHandle(
        ({ name, base64 }) => {
            const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
            const dropped = new DataTransfer();
            dropped.items.add(new File([bytes], name));

            return dropped;
        },
        { name: file.name, base64: file.bytes.toString('base64') },
    );
    await page.dispatchEvent('.level-view-host', 'drop', { dataTransfer: transfer });
    await answerReplace(page);
}

// Export from the File menu, giving back the downloaded file's name and bytes.
async function exportLevel(page: Page) {
    const downloading = page.waitForEvent('download');
    await runFileCommand(page, 'Export');
    const download = await downloading;
    const path = await download.path();

    return { name: download.suggestedFilename(), bytes: await readFile(path) };
}

// The local and central directories both claim a small size for the file inside, as a zip bomb does.
function lieAboutSizes(zip: Uint8Array, size: number) {
    const lying = zip.slice();
    const view = new DataView(lying.buffer);
    for (let at = 0; at + 4 <= lying.length; at++) {
        const signature = view.getUint32(at, true);
        if (signature === 0x04034b50) {
            view.setUint32(at + 22, size, true);
        }
        if (signature === 0x02014b50) {
            view.setUint32(at + 24, size, true);
        }
    }

    return lying;
}

let zipBomb: Buffer | undefined;

// Built once per worker: deflating 300 MB of zeros takes a few seconds.
function makeZipBomb() {
    zipBomb ??= Buffer.from(
        lieAboutSizes(
            zipSync({ 'level.json': new Uint8Array(BOMB_UNPACKED_BYTES) }, { level: 1 }),
            BOMB_DECLARED_BYTES,
        ),
    );

    return zipBomb;
}

test('a drawn shape is there after a reload', async ({ page }) => {
    await openEditor(page);
    await drawRectangle(page);
    await expectSaved(page);

    await page.reload();

    await expect(entityRow(page, 'Rectangle 1')).toBeVisible();
    await expect(page).toHaveTitle(SAVED_TITLE);
});

test('Ctrl+S saves now, says so and downloads nothing', async ({ page }) => {
    let downloads = 0;
    page.on('download', () => {
        downloads += 1;
    });
    await openEditor(page);
    await drawRectangle(page);
    await expect(page).toHaveTitle(UNSAVED_TITLE);

    await page.keyboard.press('Control+s');

    await expect(statusText(page)).toHaveText('Saved in this browser');
    await expect(page).toHaveTitle(SAVED_TITLE);
    await page.reload();
    await expect(entityRow(page, 'Rectangle 1')).toBeVisible();
    expect(downloads).toBe(0);
});

test("File's Save saves now, and the level's name and save state are not on screen", async ({ page }) => {
    await openEditor(page);
    await drawRectangle(page);

    await runFileCommand(page, 'Save');

    await expect(statusText(page)).toHaveText('Saved in this browser');
    await expect(page).toHaveTitle(SAVED_TITLE);
    await expect(page.getByRole('region', { name: 'Level file' })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Level name' })).toHaveCount(0);
});

test('a newer tab takes the level; the older one saves first, then is read-only and says so', async ({
    page,
    context,
}) => {
    await openEditor(page);
    // Not waited for: the older tab saves it as it hands the level over.
    await drawRectangle(page);

    const newer = await context.newPage();
    await openEditor(newer);
    await expect(entityRow(newer, 'Rectangle 1')).toBeVisible();
    await expect(newer.getByRole('dialog')).toHaveCount(0);

    await page.bringToFront();
    const notice = page.getByRole('dialog');
    await expect(notice).toContainText(HANDED_OVER_TEXT);
    await notice.getByRole('button', { name: 'OK' }).click();

    // Selecting still works; deleting is refused and changes nothing.
    await entityRow(page, 'Rectangle 1').click();
    await expect(entityRow(page, 'Rectangle 1')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Delete');
    await expect(statusText(page)).toHaveText(READ_ONLY_TEXT);
    await expect(entityRow(page, 'Rectangle 1')).toBeVisible();

    // Saving and renaming are refused too, Export isn't, and leaving it would lose nothing, so its title has no `*`.
    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('menuitem', { name: 'File', exact: true }).hover();
    await expect(page.getByRole('menuitem', { name: /^Save/ })).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('menuitem', { name: /^Rename level/ })).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('menuitem', { name: /^Export/ })).not.toHaveAttribute('aria-disabled', 'true');
    await expect(page).toHaveTitle(SAVED_TITLE);

    // The newer tab edits and saves.
    await newer.bringToFront();
    await newer.keyboard.press('Control+s');
    await expect(statusText(newer)).toHaveText('Saved in this browser');
});

test('an exported level, dropped on the page, imports back', async ({ page }) => {
    await openEditor(page);
    await drawRectangle(page);

    const exported = await exportLevel(page);
    expect(exported.name).toMatch(EXPORTED_NAME);

    await runFileCommand(page, 'New');
    await answerReplace(page);
    await expect(entityRow(page, 'Rectangle 1')).toHaveCount(0);
    await expectSaved(page);

    await dropFile(page, exported);

    await expect(entityRow(page, 'Rectangle 1')).toBeVisible();
    await expect(statusText(page)).toHaveText(`Imported ${exported.name}`);
    await expectSaved(page);
});

test('a full disk warns until a save works, and Export still downloads', async ({ page }) => {
    // Every write to IndexedDB fails as a full disk does, once the test turns it on.
    await page.addInitScript(() => {
        const store = IDBObjectStore.prototype;
        const put = Object.getOwnPropertyDescriptor(store, 'put')?.value as IDBObjectStore['put'];
        store.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['put']>) {
            if ((window as { diskFull?: boolean }).diskFull === true) {
                throw new DOMException('The disk is full.', 'QuotaExceededError');
            }

            return put.apply(this, args);
        };
    });
    await openEditor(page);
    await page.evaluate(() => {
        (window as { diskFull?: boolean }).diskFull = true;
    });

    await drawRectangle(page);

    await expect(statusText(page)).toContainText(SAVE_FAILED_START, { timeout: SAVE_TIMEOUT_MS });
    await expect(page).toHaveTitle(UNSAVED_TITLE);

    // Ctrl+S doesn't claim to have saved.
    await page.keyboard.press('Control+s');
    await expect(statusText(page)).toContainText(SAVE_FAILED_START);
    await expect(page).toHaveTitle(UNSAVED_TITLE);

    const exported = await exportLevel(page);
    expect(exported.name).toMatch(EXPORTED_NAME);
    expect(exported.bytes.length).toBeGreaterThan(0);

    // Room again: the next save clears the warning.
    await page.evaluate(() => {
        (window as { diskFull?: boolean }).diskFull = false;
    });
    await page.keyboard.press('Control+s');
    await expect(statusText(page)).toHaveText('Saved in this browser');
    await expect(page).toHaveTitle(SAVED_TITLE);
});

test('a zip bomb is refused while the page keeps drawing', async ({ page }) => {
    test.setTimeout(90_000);
    const bomb = makeZipBomb();
    await openEditor(page);

    // Counts the frames the page draws, and the longest wait between two of them.
    await page.evaluate(() => {
        const frames = { count: 0, longestGapMs: 0, last: performance.now() };
        (window as { frames_?: typeof frames }).frames_ = frames;
        const tick = (now: number) => {
            frames.count += 1;
            frames.longestGapMs = Math.max(frames.longestGapMs, now - frames.last);
            frames.last = now;
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });

    await dropFile(page, { name: 'bomb.editable', bytes: bomb });

    const notice = page.getByRole('dialog');
    await expect(notice).toContainText(TOO_BIG_TEXT, { timeout: 60_000 });
    await notice.getByRole('button', { name: 'OK' }).click();

    const frames = await page.evaluate(() => (window as { frames_?: { count: number; longestGapMs: number } }).frames_);
    expect(frames?.count).toBeGreaterThan(10);
    // The unpacking runs in the worker, so the page never stops drawing for long.
    expect(frames?.longestGapMs).toBeLessThan(1000);
    await expect(page).toHaveTitle(SAVED_TITLE);
});
