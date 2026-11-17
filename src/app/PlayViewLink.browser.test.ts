import { afterEach, describe, expect, test, vi } from 'vitest';

import { Box2dPhysicsEngine } from '../adapters/box2d/index.ts';
import { PixiLevelView } from '../adapters/pixi/index.ts';
import type { PixelRatioSource } from '../adapters/pixi/index.ts';
import { WorkerGameRunner } from '../adapters/worker/index.ts';
import { BodyComponent, ShapeComponent, SurfaceComponent, TransformComponent } from '../core/components/index.ts';
import { Signal } from '../core/events/index.ts';
import { Level } from '../core/level/index.ts';
import type { Entity } from '../core/level/index.ts';
import { HUNG_TEXT, NOT_RESPONDING_TEXT, PlaySession } from '../editor/play/index.ts';
import type { GameRunner } from '../editor/play/index.ts';
import { DirectGameRunner } from '../editor/play/testing/index.ts';
import { EditorSession } from '../editor/session/index.ts';
import { ManualFrames, ManualTimer } from '../editor/time/testing/index.ts';

import { PlayViewLink } from './PlayViewLink.ts';

const FRAME_MS = 1000 / 60;
const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 360;

class OnePixelRatio implements PixelRatioSource {
    private readonly changed = new Signal<number>();

    current() {
        return 1;
    }

    onChange(listener: (ratio: number) => void) {
        return this.changed.subscribe(listener);
    }
}

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

// A level with one 40 px crate that falls from the camera's middle, the camera not following it.
function crateLevel() {
    const level = Level.createNew();
    const crate = level.createEntity(level.world, level.world.children.length);
    const values = { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 };
    crate.addComponent(new TransformComponent(values));
    crate.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 40, height: 40 } }));
    crate.addComponent(new SurfaceComponent());
    crate.addComponent(new BodyComponent());

    return { level, crate };
}

function buildPlay(level: Level, runner: GameRunner) {
    const timer = new ManualTimer();
    const clock = timer.clock;
    const frames = new ManualFrames();
    const session = new EditorSession({ level, clock, timer, frames });
    const play = new PlaySession({
        session,
        runner,
        clock,
        timer,
        frames,
        commitTyping: () => {},
        saveNow: () => Promise.resolve(),
        isDialogOpen: () => false,
    });

    // One frame: the session sends the ticks due and draws the mirror, the game answers, and the level
    // view renders.
    async function nextFrame(ms = FRAME_MS) {
        clock.advance(ms);
        frames.runFrame(clock.nowMs());
        await settle();
    }

    return { session, play, frames, clock, nextFrame };
}

// Lets the game's answers, already given, reach the session.
async function settle() {
    for (let i = 0; i < 20; i++) {
        await Promise.resolve();
    }
}

async function showInPage(built: ReturnType<typeof buildPlay>) {
    const { session, play, frames } = built;
    const drawing = { showUnstyled: true };
    const parts = {
        view: session.view,
        settings: session.viewSettings,
        frames,
        pixelRatio: new OnePixelRatio(),
        drawing,
    };
    const levelView = await PixiLevelView.create(parts);
    const host = document.createElement('div');
    host.style.cssText = `width: ${VIEW_WIDTH}px; height: ${VIEW_HEIGHT}px;`;
    document.body.append(host);
    levelView.mount(host);
    levelView.follow(session);
    const disconnect = new PlayViewLink(play, levelView, session).connect();
    cleanups.push(() => {
        disconnect();
        levelView.destroy();
        host.remove();
    });
    await vi.waitFor(() => expect(session.view.size).toEqual({ width: VIEW_WIDTH, height: VIEW_HEIGHT }));

    return levelView;
}

// Where the crate's node is drawn on the canvas, in screen pixels.
function drawnPosition(levelView: PixiLevelView, crate: Entity) {
    const node = levelView.levelDisplay?.nodeOf(crate);
    if (node === undefined) throw new Error('The crate has no node.');

    return node.container.getGlobalPosition();
}

function mirroredCrate(play: PlaySession, crate: Entity) {
    const found = play.mirror?.level.findEntity(crate.id);
    if (found === undefined) throw new Error('The mirror has no crate.');

    return found;
}

async function startPlaying(built: ReturnType<typeof buildPlay>) {
    built.play.play();
    await vi.waitFor(() => expect(built.play.state).toBe('playing'));
}

describe('test play in the level view', () => {
    test('a falling box is drawn lower each frame through the camera, and Stop shows the editor again', async () => {
        const { level, crate } = crateLevel();
        const built = buildPlay(level, new DirectGameRunner(new Box2dPhysicsEngine()));
        const levelView = await showInPage(built);
        const editorView = built.session.view;
        const editorPlace = { zoom: editorView.zoom, middle: editorView.middle };

        await startPlaying(built);
        expect(levelView.levelDisplay?.nodeOf(crate)).toBeUndefined();
        expect(levelView.shownView).not.toBe(editorView);

        const heights: number[] = [];
        for (let frame = 0; frame < 6; frame++) {
            await built.nextFrame();
            await built.nextFrame();
            heights.push(drawnPosition(levelView, mirroredCrate(built.play, crate)).y);
        }

        for (let index = 1; index < heights.length; index++) {
            expect(heights[index]).toBeGreaterThan(heights[index - 1] ?? Infinity);
        }

        built.play.stop();
        await built.nextFrame();

        expect(levelView.shownView).toBe(editorView);
        expect(levelView.levelDisplay?.nodeOf(crate)).toBeDefined();
        expect({ zoom: editorView.zoom, middle: editorView.middle }).toEqual(editorPlace);
    });

    test('a game that never answers is ended by the watchdog, and the next Play starts in a fresh worker', async () => {
        const workers: Worker[] = [];
        const runner = new WorkerGameRunner(() => {
            const worker = new Worker(new URL('./workers/testing/silentGame.worker.ts', import.meta.url), {
                type: 'module',
            });
            workers.push(worker);

            return worker;
        });
        cleanups.push(() => {
            for (const worker of workers) {
                worker.terminate();
            }
        });
        const built = buildPlay(crateLevel().level, runner);
        runner.prepare();

        await startPlaying(built);
        // The pacer's first frame starts its count, and the second sends a batch, which is never answered.
        // Frames 0.5 s apart are a page awake.
        await built.nextFrame();
        await built.nextFrame();
        for (let waited = 0; waited < 2000; waited += 500) {
            await built.nextFrame(500);
        }
        expect(built.play.notice).toBe(NOT_RESPONDING_TEXT);

        for (let waited = 2000; waited < 5000; waited += 500) {
            await built.nextFrame(500);
        }
        expect(built.play.state).toBe('ended');
        expect(built.play.endedMessage).toBe(HUNG_TEXT);
        expect(workers).toHaveLength(2);

        built.play.stop();
        await startPlaying(built);

        expect(workers).toHaveLength(2);
    });
});
