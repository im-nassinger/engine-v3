import { flushSync } from 'react-dom';
import { afterEach, describe, expect, test } from 'vitest';
import { PathComponent } from '../../src/core/components/index.ts';
import type { Point } from '../../src/core/geometry/index.ts';
import { PencilTool, SelectTool } from '../../src/editor/tools/index.ts';
import {
    closeEntityInspectorPage,
    entityInspectorContainer,
    openEntityInspectorPage,
    select,
    showEntityInspector,
} from '../../src/ui/entity-inspector/EntityInspector/testing/entityInspectorPage.ts';
import { buildPathLevel } from '../levels/generator/buildPathLevel.ts';
import {
    openLevelViewPage,
    percentile,
    pointerAt,
    runFrames,
    timeMs,
    waitForDrawing,
} from './testing/levelViewPage.ts';
import type { LevelViewPage } from './testing/levelViewPage.ts';

// The targets in v2's architecture, on one 2,000-point path among 10,000 entities: selecting it within
// 0.05 s, dragging one of its points with 95% of frames within 16.7 ms, the Entity inspector showing its
// Points within 0.2 s, and the Pencil's fit of a 10 s stroke within 0.1 s of the release.
const ENTITY_COUNT = 10_000;
const POINT_COUNT = 2_000;
const SELECT_TIME_LIMIT_MS = 50;
const FRAME_TIME_LIMIT_MS = 16.7;
const SMOOTH_SHARE = 0.95;
const POINTS_TIME_LIMIT_MS = 200;
const FIT_TIME_LIMIT_MS = 100;
// A 2 s drag at 60 frames a second.
const DRAG_FRAMES = 120;
const CLICKS = 5;
// A 10 s stroke, one pointer move a frame at 60 frames a second, as the browser sends them.
const STROKE_MOVES = 600;
const SHOWS = 5;
// performance.md: CI only catches a large slowdown, since its browsers draw without a GPU; the targets
// are checked on the owner's laptop and written there.
const LARGE_SLOWDOWN = 5;

let page: LevelViewPage | undefined;

afterEach(() => {
    page?.close();
    page = undefined;
});

function buildLevel() {
    return buildPathLevel(ENTITY_COUNT, POINT_COUNT);
}

// Where a share of the way round the path's ring is on screen, inside its fill.
function insideRing(opened: LevelViewPage, share: number): Point {
    const angle = share * 2 * Math.PI;
    const radius = 2_000;

    return opened.session.view.levelToScreen({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
}

function requireSelectTool(opened: LevelViewPage) {
    const tool = opened.tools.active;
    if (!(tool instanceof SelectTool)) throw new Error('The Select tool is not picked.');

    return tool;
}

// A hand's 10 s scribble across the level view, in screen positions, ending away from its start.
function strokeAt(move: number): Point {
    const seconds = move / 60;
    const wobble = 3 * Math.sin(2 * Math.PI * 7 * seconds);

    return {
        x: 640 + 500 * Math.sin(2 * Math.PI * 0.27 * seconds) + wobble,
        y: 400 + 300 * Math.sin(2 * Math.PI * 0.61 * seconds) - wobble,
    };
}

describe('a 2,000-point path among 10,000 entities', () => {
    test('a click selects it within 0.05 s', async () => {
        const { level, path } = buildLevel();
        const opened = await openLevelViewPage(level);
        page = opened;
        const times: number[] = [];

        for (let click = 0; click < CLICKS; click += 1) {
            opened.session.openLevel.selection.clear();
            runFrames(opened.frames);
            waitForDrawing(opened);
            const at = insideRing(opened, click / CLICKS);

            times.push(
                timeMs(() => {
                    opened.tools.pointerDown(pointerAt(opened, at));
                    opened.tools.pointerUp(pointerAt(opened, at));
                    runFrames(opened.frames);
                }),
            );
            waitForDrawing(opened);

            expect(opened.session.openLevel.selection.entities).toEqual([path]);
            // The click is timed to the frame that redraws the selection overlay, with the path's outline
            // and frame.
        }

        const slowest = Math.max(...times);
        console.info(
            `Selecting a ${POINT_COUNT}-point path among ${ENTITY_COUNT}: at most ${slowest.toFixed(1)} ms (target ${SELECT_TIME_LIMIT_MS} ms)`,
        );
        expect(slowest).toBeLessThan(LARGE_SLOWDOWN * SELECT_TIME_LIMIT_MS);
    });

    test('dragging one of its points keeps 95% of frames within 16.7 ms', async () => {
        const { level, path } = buildLevel();
        const opened = await openLevelViewPage(level);
        page = opened;
        const tool = requireSelectTool(opened);
        const inside = insideRing(opened, 0);
        opened.tools.pointerDown(pointerAt(opened, inside));
        opened.tools.pointerUp(pointerAt(opened, inside));
        opened.tools.pointerDown(pointerAt(opened, inside, 2));
        opened.tools.pointerUp(pointerAt(opened, inside, 2));
        runFrames(opened.frames);
        waitForDrawing(opened);
        expect(tool.editedPoints?.entity).toBe(path);
        const startPoint = path.requireComponent(PathComponent).get('path').points[0];

        const grabbed = tool.editedPoints?.levelPoints()[0];
        if (grabbed === undefined) throw new Error('The path has no points to edit.');
        const from = opened.session.view.levelToScreen(grabbed);
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
            `Dragging a point of a ${POINT_COUNT}-point path among ${ENTITY_COUNT}: 95% of frames within ${smooth.toFixed(1)} ms (target ${FRAME_TIME_LIMIT_MS} ms)`,
        );
        expect(path.requireComponent(PathComponent).get('path').points[0]).not.toEqual(startPoint);
        expect(opened.session.openLevel.history.undoLabel).toBe('Move points of Path 1');
        expect(smooth).toBeLessThan(LARGE_SLOWDOWN * FRAME_TIME_LIMIT_MS);
    });

    test('the Entity inspector shows its Points within 0.2 s', async () => {
        openEntityInspectorPage();
        try {
            const { level, path } = buildLevel();
            const { session, frames } = showEntityInspector(level);
            // The first render, of the World's cards, comes after the test's turn.
            await expect.poll(() => entityInspectorContainer().querySelector('.entity-inspector-card')).not.toBeNull();
            const crate = level.world.children[1];
            if (crate === undefined) throw new Error('The level has no entity besides the path.');
            const times: number[] = [];

            for (let show = 0; show < SHOWS; show += 1) {
                // From another entity's cards to the path's, as a click in the level view does.
                flushSync(() => select(session, [crate]));
                runFrames(frames);
                let rowCount = 0;

                times.push(
                    timeMs(() => {
                        flushSync(() => select(session, [path]));
                        const rows = entityInspectorContainer().querySelectorAll('.path-point-row');
                        rows[rows.length - 1]?.getBoundingClientRect();
                        rowCount = rows.length;
                        runFrames(frames);
                    }),
                );
                expect(rowCount).toBeGreaterThan(0);
            }

            const slowest = Math.max(...times);
            console.info(
                `The Entity inspector shows the Points of a ${POINT_COUNT}-point path among ${ENTITY_COUNT}: at most ${slowest.toFixed(1)} ms (target ${POINTS_TIME_LIMIT_MS} ms)`,
            );
            expect(slowest).toBeLessThan(LARGE_SLOWDOWN * POINTS_TIME_LIMIT_MS);
        } finally {
            closeEntityInspectorPage();
        }
    });

    test("the Pencil's fit of a 10 s stroke finishes within 0.1 s of the release", async () => {
        const { level } = buildLevel();
        const opened = await openLevelViewPage(level);
        page = opened;
        opened.tools.pick('pencil');
        const pencil = opened.tools.active;
        if (!(pencil instanceof PencilTool)) throw new Error('The Pencil is not picked.');
        const entityCount = level.entityCount;

        opened.tools.pointerDown(pointerAt(opened, strokeAt(0)));
        for (let move = 1; move <= STROKE_MOVES; move += 1) {
            opened.tools.pointerMove(pointerAt(opened, strokeAt(move)));
            runFrames(opened.frames);
        }
        waitForDrawing(opened);
        const draggedCount = pencil.pencilStroke?.points.length ?? 0;
        const end = pointerAt(opened, strokeAt(STROKE_MOVES));

        const releaseTimeMs = timeMs(() => {
            opened.tools.pointerUp(end);
            runFrames(opened.frames);
        });
        waitForDrawing(opened);

        const [drawn] = opened.session.openLevel.selection.entities;
        const pointCount = drawn?.getComponent(PathComponent)?.get('path').points.length ?? 0;
        console.info(
            `The Pencil's release after a 10 s stroke of ${draggedCount} points among ${ENTITY_COUNT}: ${releaseTimeMs.toFixed(1)} ms, ` +
                `${pointCount} points fitted (target ${FIT_TIME_LIMIT_MS} ms)`,
        );
        expect(level.entityCount).toBe(entityCount + 1);
        expect(pointCount).toBeGreaterThan(1);
        expect(releaseTimeMs).toBeLessThan(LARGE_SLOWDOWN * FIT_TIME_LIMIT_MS);
    });
});
