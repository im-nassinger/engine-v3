import { flushSync } from 'react-dom';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { V1_LEVEL_LIMITS } from '../../src/core/level-data/index.ts';
import { ManualFrames } from '../../src/editor/time/testing/index.ts';
import {
    closePanelPage,
    createSession,
    mountPanel,
    openPanelPage,
    shownRows,
} from '../../src/ui/entities-panel/EntitiesPanel/testing/panelPage.ts';
import { buildTestLevel } from '../levels/generator/buildTestLevel.ts';
import { percentile, runFrames, timeMs } from './testing/levelViewPage.ts';

// The targets in performance.md: the panel opens in under 0.2 s at 10,000 entities, and scrolls
// smoothly at any size, 95% of frames within 16.7 ms.
const OPEN_COUNT = 10_000;
const OPEN_TIME_LIMIT_MS = 200;
const FRAME_TIME_LIMIT_MS = 16.7;
const SMOOTH_SHARE = 0.95;
// A 2 s scroll from top to bottom at 60 frames a second: each frame lands on rows not built yet.
const SCROLL_FRAMES = 120;
// performance.md: CI only catches a large slowdown, since its machines are slower; the targets are
// checked on the owner's laptop and written there.
const LARGE_SLOWDOWN = 5;

beforeEach(openPanelPage);
afterEach(closePanelPage);

function scrollList() {
    const list = document.querySelector<HTMLElement>('.entities-list');
    if (list === null) throw new Error('The panel shows its list.');

    return list;
}

// Lays out the rows built, as the browser does before it paints them.
function layOutRows() {
    const rows = shownRows();
    rows.at(-1)?.getBoundingClientRect();

    return rows;
}

// The panel's work for one frame of scrolling: the virtual list hears the scroll, builds the rows now
// on screen and the browser lays them out. The browser's own scroll event would come in its next
// frame, at a fixed rate in a headless browser, so the test sends it itself.
function scrollFrame(list: HTMLElement, top: number) {
    list.scrollTop = top;
    list.dispatchEvent(new Event('scroll'));

    return layOutRows();
}

// Between timed frames the browser paints, untimed, as it would between two scroll events.
function nextPaint() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
}

describe('the Entities panel', () => {
    test('at 10,000 entities it shows its first rows within 0.2 s of mounting', () => {
        // The World and the camera are counted in the level's entities.
        const { level } = buildTestLevel(OPEN_COUNT - 2);
        const frames = new ManualFrames();
        const session = createSession(level, frames);

        let rowCount = 0;
        const openTimeMs = timeMs(() => {
            flushSync(() => mountPanel(session));
            rowCount = layOutRows().length;
            runFrames(frames);
        });

        console.info(
            `The Entities panel opens at ${OPEN_COUNT} entities in ${openTimeMs.toFixed(1)} ms (target ${OPEN_TIME_LIMIT_MS} ms)`,
        );
        expect(rowCount).toBeGreaterThan(0);
        expect(openTimeMs).toBeLessThan(LARGE_SLOWDOWN * OPEN_TIME_LIMIT_MS);
    });

    test.each([OPEN_COUNT, V1_LEVEL_LIMITS.maxEntities])(
        'at %i entities it scrolls from top to bottom with 95% of frames within 16.7 ms',
        async (entityCount) => {
            const { level } = buildTestLevel(entityCount - 2);
            const frames = new ManualFrames();
            const session = createSession(level, frames);
            flushSync(() => mountPanel(session));
            const list = scrollList();
            const bottom = list.scrollHeight - list.clientHeight;
            expect(session.openLevel.entitiesRows.rows).toHaveLength(entityCount);

            const times: number[] = [];
            let lastRows: HTMLElement[] = [];
            for (let frame = 1; frame <= SCROLL_FRAMES; frame += 1) {
                const top = Math.round((bottom * frame) / SCROLL_FRAMES);
                times.push(
                    timeMs(() => {
                        lastRows = scrollFrame(list, top);
                        runFrames(frames);
                    }),
                );
                await nextPaint();
            }

            const smooth = percentile(times, SMOOTH_SHARE);
            console.info(
                `Scrolling the Entities panel at ${entityCount} entities: 95% of frames within ${smooth.toFixed(1)} ms (target ${FRAME_TIME_LIMIT_MS} ms)`,
            );
            expect(list.scrollTop).toBe(bottom);
            // The camera is the World's last child, so its row is the last.
            expect(lastRows.at(-1)?.querySelector('.name')?.textContent).toBe('Camera');
            expect(smooth).toBeLessThan(LARGE_SLOWDOWN * FRAME_TIME_LIMIT_MS);
        },
    );
});
