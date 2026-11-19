import { afterEach, describe, expect, test, vi } from 'vitest';
import { MinimapView } from '../../src/adapters/pixi/index.ts';
import { Signal } from '../../src/core/events/index.ts';
import { TransformComponent } from '../../src/core/components/index.ts';
import { buildTestLevel } from '../levels/generator/buildTestLevel.ts';
import {
    openLevelViewPage,
    percentile,
    pointerAt,
    runFrames,
    screenMiddleOf,
    timeMs,
    waitForDrawing,
} from './testing/levelViewPage.ts';
import type { LevelViewPage } from './testing/levelViewPage.ts';

// The targets in performance.md, at 10,000 entities.
const ENTITY_COUNT = 10_000;
const SELECT_TIME_LIMIT_MS = 50;
const FRAME_TIME_LIMIT_MS = 16.7;
const SMOOTH_SHARE = 0.95;
const MOVED_COUNT = 1_000;
// A 2 s drag at 60 frames a second.
const DRAG_FRAMES = 120;
const CLICKS = 5;
const FRAME_MS = 1000 / 60;
// About what a frame has left once the drag has taken its 15 ms (performance.md).
const MINIMAP_FRAME_SHARE_LIMIT_MS = 1;
// Each block has four loose crates; the top one of a stack is the only entity within the hit tolerance
// of its middle at the whole level's zoom.
const CRATES_PER_STACK = 4;
const TOP_OF_STACK = 3;
// performance.md: CI only catches a large slowdown, since its browsers draw without a GPU; the
// targets are checked on the owner's laptop and written there.
const LARGE_SLOWDOWN = 5;

let page: LevelViewPage | undefined;

function showMinimap(opened: LevelViewPage) {
    const pixelRatio = {
        current: () => 1,
        onChange: (listener: (ratio: number) => void) => new Signal<number>().subscribe(listener),
    };
    const minimap = new MinimapView({ view: opened.session.view, timer: opened.timer, pixelRatio });
    const host = document.createElement('div');
    host.style.cssText = 'width: 174px; height: 84px;';
    document.body.appendChild(host);
    minimap.follow(opened.session);
    minimap.mount(host);

    return {
        minimap,
        close: () => {
            minimap.destroy();
            host.remove();
        },
    };
}

afterEach(() => {
    page?.close();
    page = undefined;
});

describe('the Select tool at 10,000 entities', () => {
    test('a click shows the selection within 0.05 s', async () => {
        const { level, looseCrates } = buildTestLevel(ENTITY_COUNT);
        const opened = await openLevelViewPage(level);
        page = opened;
        const times: number[] = [];

        for (let click = 0; click < CLICKS; click += 1) {
            const stack = click * 97;
            const crate = looseCrates[stack * CRATES_PER_STACK + TOP_OF_STACK];
            if (crate === undefined) throw new Error('The level has fewer crates than the test clicks.');
            const at = screenMiddleOf(opened, crate);

            const elapsed = timeMs(() => {
                opened.tools.pointerDown(pointerAt(opened, at));
                opened.tools.pointerUp(pointerAt(opened, at));
                runFrames(opened.frames);
            });
            times.push(elapsed);
            waitForDrawing(opened);

            expect(opened.session.openLevel.selection.entities).toEqual([crate]);
            expect(opened.levelView.overlays.selection.drawn.outlines).toBe(1);
        }

        const slowest = Math.max(...times);
        console.info(
            `Selecting at ${ENTITY_COUNT} entities: at most ${slowest.toFixed(1)} ms (target ${SELECT_TIME_LIMIT_MS} ms)`,
        );
        expect(slowest).toBeLessThan(LARGE_SLOWDOWN * SELECT_TIME_LIMIT_MS);
    });

    test('dragging 1,000 selected entities keeps 95% of frames under 16.7 ms', async () => {
        const { level, looseCrates } = buildTestLevel(ENTITY_COUNT);
        const opened = await openLevelViewPage(level);
        page = opened;
        const moved = looseCrates.slice(0, MOVED_COUNT);
        const grabbed = moved[TOP_OF_STACK];
        if (grabbed === undefined) throw new Error('The level has no crate to grab.');
        const startX = grabbed.getComponent(TransformComponent)?.get('position').x;

        opened.session.openLevel.selection.replace(moved.map((crate) => crate.id));
        runFrames(opened.frames);
        const from = screenMiddleOf(opened, grabbed);
        opened.tools.pointerDown(pointerAt(opened, from));

        const times: number[] = [];
        for (let frame = 1; frame <= DRAG_FRAMES; frame += 1) {
            const to = { x: from.x + frame, y: from.y + frame / 2 };
            times.push(
                timeMs(() => {
                    opened.tools.pointerMove(pointerAt(opened, to));
                    runFrames(opened.frames);
                }),
            );
            waitForDrawing(opened);
        }
        const end = { x: from.x + DRAG_FRAMES, y: from.y + DRAG_FRAMES / 2 };
        opened.tools.pointerUp(pointerAt(opened, end));
        runFrames(opened.frames);

        const smooth = percentile(times, SMOOTH_SHARE);
        console.info(
            `Dragging ${MOVED_COUNT} of ${ENTITY_COUNT}: 95% of frames within ${smooth.toFixed(1)} ms (target ${FRAME_TIME_LIMIT_MS} ms)`,
        );
        expect(grabbed.getComponent(TransformComponent)?.get('position').x).not.toBe(startX);
        expect(opened.session.openLevel.history.undoLabel).toBe(`Move ${MOVED_COUNT} entities`);
        expect(smooth).toBeLessThan(LARGE_SLOWDOWN * FRAME_TIME_LIMIT_MS);
    });

    test('the minimap adds no dropped frames to the drag', async () => {
        const { level, looseCrates } = buildTestLevel(ENTITY_COUNT);
        const opened = await openLevelViewPage(level);
        page = opened;
        const shown = showMinimap(opened);
        await vi.waitFor(() => expect(shown.minimap.canvas.width).toBe(174));
        const moved = looseCrates.slice(0, MOVED_COUNT);
        const grabbed = moved[TOP_OF_STACK];
        if (grabbed === undefined) throw new Error('The level has no crate to grab.');

        opened.session.openLevel.selection.replace(moved.map((crate) => crate.id));
        runFrames(opened.frames);
        const from = screenMiddleOf(opened, grabbed);
        opened.tools.pointerDown(pointerAt(opened, from));

        const dragTimes: number[] = [];
        const frameTimes: number[] = [];
        const minimapTimes: number[] = [];
        for (let frame = 1; frame <= DRAG_FRAMES; frame += 1) {
            const to = { x: from.x + frame, y: from.y + frame / 2 };
            const frameTime = timeMs(() => {
                opened.tools.pointerMove(pointerAt(opened, to));
                runFrames(opened.frames);
            });
            // The minimap's slices run between frames, on the timer, as they do in the browser.
            const minimapTime = timeMs(() => opened.timer.advance(FRAME_MS));
            dragTimes.push(frameTime);
            frameTimes.push(frameTime + minimapTime);
            minimapTimes.push(minimapTime);
            waitForDrawing(opened);
        }
        const end = { x: from.x + DRAG_FRAMES, y: from.y + DRAG_FRAMES / 2 };
        opened.tools.pointerUp(pointerAt(opened, end));
        runFrames(opened.frames);
        shown.close();

        const smooth = percentile(frameTimes, SMOOTH_SHARE);
        const minimapShare = percentile(minimapTimes, SMOOTH_SHARE);
        const slowestMinimap = Math.max(...minimapTimes);
        const droppedByDrag = dragTimes.filter((time) => time > FRAME_TIME_LIMIT_MS).length;
        const droppedWithMinimap = frameTimes.filter((time) => time > FRAME_TIME_LIMIT_MS).length;
        console.info(
            `Dragging with the minimap: 95% of frames within ${smooth.toFixed(1)} ms (target ${FRAME_TIME_LIMIT_MS} ms), ` +
                `the minimap's part within ${minimapShare.toFixed(2)} ms, at most ${slowestMinimap.toFixed(2)} ms; ` +
                `frames over the target: ${droppedByDrag} without it, ${droppedWithMinimap} with it`,
        );
        expect(smooth).toBeLessThan(LARGE_SLOWDOWN * FRAME_TIME_LIMIT_MS);
        expect(minimapShare).toBeLessThan(LARGE_SLOWDOWN * MINIMAP_FRAME_SHARE_LIMIT_MS);
    });
});
