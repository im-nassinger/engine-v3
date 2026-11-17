import { expect, vi } from 'vitest';
import { PixiLevelView } from '../../../src/adapters/pixi/index.ts';
import { createTools } from '../../../src/app/createTools.ts';
import { EditorSelectionSource } from '../../../src/app/EditorSelectionSource.ts';
import { Signal } from '../../../src/core/events/index.ts';
import type { Point } from '../../../src/core/geometry/index.ts';
import type { Entity, Level } from '../../../src/core/level/index.ts';
import { createCommandRegistry } from '../../../src/editor/commands/index.ts';
import { EditorSession } from '../../../src/editor/session/index.ts';
import { ManualClock, ManualFrames, ManualTimer } from '../../../src/editor/time/testing/index.ts';
import type { LevelPointerInput, ToolController } from '../../../src/editor/tools/index.ts';

// A mid-sized laptop window's level view.
const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 800;
const NO_MODIFIERS = { shift: false, alt: false, ctrl: false };

export type LevelViewPage = {
    readonly session: EditorSession;
    readonly tools: ToolController;
    readonly levelView: PixiLevelView;
    readonly frames: ManualFrames;
    readonly close: () => void;
};

// The editor's level view with the Select tool on a level, built as EditorComposition builds it, but on
// ManualFrames: a test runs each frame itself and times the work in it, the pointer's and the drawing's.
// A headless browser's own frames come at a fixed rate whatever the work, so they would measure nothing.
export async function openLevelViewPage(level: Level): Promise<LevelViewPage> {
    const frames = new ManualFrames();
    const session = new EditorSession({ level, clock: new ManualClock(), timer: new ManualTimer(), frames });
    const commands = createCommandRegistry(session);
    const pixelRatio = {
        current: () => 1,
        onChange: (listener: (ratio: number) => void) => new Signal<number>().subscribe(listener),
    };
    const levelView = await PixiLevelView.create({
        view: session.view,
        settings: session.viewSettings,
        frames,
        pixelRatio,
        drawing: { showUnstyled: true },
    });
    const tools = createTools(session, commands);

    const host = document.createElement('div');
    host.style.cssText = `width: ${VIEW_WIDTH}px; height: ${VIEW_HEIGHT}px;`;
    document.body.appendChild(host);
    levelView.mount(host);
    await vi.waitFor(() => expect(session.view.size).toEqual({ width: VIEW_WIDTH, height: VIEW_HEIGHT }));

    levelView.follow(session);
    levelView.showSelection(new EditorSelectionSource(session, tools));
    // The whole level in view, so every entity is drawn: the slowest case.
    session.view.fit(session.openLevel.caches.bounds.subtreeBoundsOf(level.world));
    runFrames(frames);

    const close = () => {
        levelView.destroy();
        host.remove();
    };

    return { session, tools, levelView, frames, close };
}

// Runs frames until none is asked for, as the browser would before the next input.
export function runFrames(frames: ManualFrames) {
    while (frames.pendingCount > 0) {
        frames.runFrame();
    }
}

// Waits until the GPU has drawn every frame run so far. A browser shows a frame only once it is drawn, so
// it never queues more; a test running frames back to back would. Without a GPU the drawing is slow, and
// the queue it left would hold up the next frame timed, or the renderer's destroy, by many seconds.
export function waitForDrawing(page: Pick<LevelViewPage, 'levelView'>) {
    const canvas = page.levelView.canvas;
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('The level view draws off screen.');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (context === null) throw new Error('The level view draws without WebGL.');

    // Reading a pixel back waits for the drawing before it; gl.finish() returns at once in Chromium.
    context.readPixels(0, 0, 1, 1, context.RGBA, context.UNSIGNED_BYTE, new Uint8Array(4));
}

// Where an entity's middle is on screen.
export function screenMiddleOf(page: LevelViewPage, entity: Entity): Point {
    const bounds = page.session.openLevel.caches.bounds.subtreeBoundsOf(entity);
    if (bounds === undefined) throw new Error('The entity draws nothing.');

    return page.session.view.levelToScreen(bounds.centre);
}

export function pointerAt(page: LevelViewPage, screenPosition: Point, clickCount = 1): LevelPointerInput {
    const levelPosition = page.session.view.screenToLevel(screenPosition);

    return { levelPosition, screenPosition, button: 'left', modifiers: NO_MODIFIERS, clickCount };
}

// The time a run of work takes, in milliseconds.
export function timeMs(work: () => void) {
    const start = performance.now();
    work();

    return performance.now() - start;
}

// The value below which the given share of the times fall.
export function percentile(times: readonly number[], share: number) {
    const sorted = [...times].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.ceil(share * sorted.length) - 1);

    return sorted[index] ?? 0;
}
