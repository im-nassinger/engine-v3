import { afterEach, describe, expect, test } from 'vitest';
import { TransformComponent } from '../../src/core/components/index.ts';
import { buildTestLevel } from '../levels/generator/buildTestLevel.ts';
import {
    openLevelViewPage,
    percentile,
    pointerAt,
    runFrames,
    screenMiddleOf,
    timeMs,
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
// Each block has four loose crates; the top one of a stack is the only entity within the hit tolerance
// of its middle at the whole level's zoom.
const CRATES_PER_STACK = 4;
const TOP_OF_STACK = 3;
// performance.md: CI only catches a large slowdown, since its browsers draw without a GPU; the
// targets are checked on the owner's laptop and written there.
const LARGE_SLOWDOWN = 5;

let page: LevelViewPage | undefined;

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
});
