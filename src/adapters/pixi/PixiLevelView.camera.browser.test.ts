import { afterEach, describe, expect, test, vi } from 'vitest';
import { JointComponent, StyleComponent, TransformComponent } from '../../core/components/index.ts';
import { BoundsCache, PiecesCache, WorldMatrixCache } from '../../core/derived/index.ts';
import { Level } from '../../core/level/index.ts';
import { Signal } from '../../core/events/index.ts';
import { ManualFrames } from '../../editor/time/testing/index.ts';
import { ViewSettings, ViewState } from '../../editor/view/index.ts';
import type { ScreenRect } from '../../editor/play/index.ts';
import { PixiLevelView } from './PixiLevelView.ts';
import type { PixelRatioSource } from './PixiLevelView.ts';

const CAMERA_BOX = { width: 1920, height: 1080 };
const RED = [255, 0, 0, 255];
const BLACK = [0, 0, 0, 255];

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

function makeHost(width: number, height: number) {
    const host = document.createElement('div');
    host.style.width = `${width}px`;
    host.style.height = `${height}px`;
    document.body.appendChild(host);
    cleanups.push(() => host.remove());

    return host;
}

// A new level whose background is red everywhere, far past the camera's box, so any of it drawn on a
// bar would show.
function redLevel() {
    const level = Level.createNew();
    level.world.requireComponent(StyleComponent).set('fill', { kind: 'solid', colour: '#FF0000FF' });

    const pieces = new PiecesCache(level);
    const worldMatrices = new WorldMatrixCache(level);
    const bounds = new BoundsCache(level, worldMatrices);
    cleanups.push(() => {
        bounds.dispose();
        worldMatrices.dispose();
        pieces.dispose();
    });

    return { level, caches: { pieces, bounds, worldMatrices } };
}

async function showRedLevel(width: number, height: number) {
    const view = new ViewState();
    const frames = new ManualFrames();
    const settings = new ViewSettings();
    // Only the level and the bars are drawn, so a pixel's colour says which of the two covers it.
    settings.set('grid', false);
    settings.set('cameraFrame', false);
    const drawing = { showUnstyled: true };
    const levelView = await PixiLevelView.create({ view, settings, frames, pixelRatio: new OnePixelRatio(), drawing });
    cleanups.push(() => levelView.destroy());

    const host = makeHost(width, height);
    levelView.mount(host);
    await vi.waitFor(() => expect(view.size).toEqual({ width, height }));

    const { level, caches } = redLevel();
    levelView.show(level, caches);
    frames.runFrame();

    return { levelView, view, settings, frames, host, level };
}

function pixelAt(pixels: Uint8ClampedArray, width: number, x: number, y: number) {
    const start = (y * width + x) * 4;

    return [...pixels.slice(start, start + 4)];
}

// Every pixel inside the rectangle has this colour.
function expectFilled(levelView: PixiLevelView, rect: ScreenRect, colour: number[]) {
    const { pixels, width } = levelView.readPixels();
    const wrong: string[] = [];

    for (let y = rect.y; y < rect.y + rect.height; y += 1) {
        for (let x = rect.x; x < rect.x + rect.width; x += 1) {
            const found = pixelAt(pixels, width, x, y);
            if (found.join() !== colour.join()) {
                wrong.push(`(${x}, ${y}) is ${found.join()}`);
            }
        }
    }

    expect(wrong.slice(0, 5)).toEqual([]);
}

// Where the camera's box lands on the screen, from the view the canvas is drawn with.
function boxOnScreen(levelView: PixiLevelView, position: { x: number; y: number }) {
    const view = levelView.shownView;
    const topLeft = view.levelToScreen({ x: position.x - CAMERA_BOX.width / 2, y: position.y - CAMERA_BOX.height / 2 });
    const bottomRight = view.levelToScreen({
        x: position.x + CAMERA_BOX.width / 2,
        y: position.y + CAMERA_BOX.height / 2,
    });

    return { x: topLeft.x, y: topLeft.y, width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y };
}

describe('PixiLevelView through the camera', () => {
    test('at 16:9 the camera box fills the canvas and there are no bars', async () => {
        const { levelView, frames } = await showRedLevel(320, 180);

        levelView.showThroughCamera({ x: 100, y: -50 }, CAMERA_BOX);
        frames.runFrame();

        expect(levelView.overlays.letterbox.bars).toEqual([]);
        expect(boxOnScreen(levelView, { x: 100, y: -50 })).toEqual({ x: 0, y: 0, width: 320, height: 180 });
        expectFilled(levelView, { x: 0, y: 0, width: 320, height: 180 }, RED);
    });

    test('at 4:3 the box fills the width between black bars above and below', async () => {
        const { levelView, frames } = await showRedLevel(320, 240);

        levelView.showThroughCamera({ x: 0, y: 0 }, CAMERA_BOX);
        frames.runFrame();

        const [top, bottom] = levelView.overlays.letterbox.bars;
        expect(top).toEqual({ x: 0, y: 0, width: 320, height: 30 });
        expect(bottom).toEqual({ x: 0, y: 210, width: 320, height: 30 });
        expect(boxOnScreen(levelView, { x: 0, y: 0 })).toEqual({ x: 0, y: 30, width: 320, height: 180 });
        expectFilled(levelView, { x: 0, y: 30, width: 320, height: 180 }, RED);
        expectFilled(levelView, { x: 0, y: 0, width: 320, height: 30 }, BLACK);
        expectFilled(levelView, { x: 0, y: 210, width: 320, height: 30 }, BLACK);
    });

    test('at 21:9 the box fills the height between black bars at the sides', async () => {
        const { levelView, frames } = await showRedLevel(420, 180);

        levelView.showThroughCamera({ x: 0, y: 0 }, CAMERA_BOX);
        frames.runFrame();

        const [left, right] = levelView.overlays.letterbox.bars;
        expect(left).toEqual({ x: 0, y: 0, width: 50, height: 180 });
        expect(right).toEqual({ x: 370, y: 0, width: 50, height: 180 });
        expect(boxOnScreen(levelView, { x: 0, y: 0 })).toEqual({ x: 50, y: 0, width: 320, height: 180 });
        expectFilled(levelView, { x: 50, y: 0, width: 320, height: 180 }, RED);
        expectFilled(levelView, { x: 0, y: 0, width: 50, height: 180 }, BLACK);
        expectFilled(levelView, { x: 370, y: 0, width: 50, height: 180 }, BLACK);
    });

    test('the window changing size fits the box again', async () => {
        const { levelView, view, host, frames } = await showRedLevel(320, 180);
        levelView.showThroughCamera({ x: 0, y: 0 }, CAMERA_BOX);
        frames.runFrame();

        host.style.height = '240px';
        await vi.waitFor(() => expect(view.size).toEqual({ width: 320, height: 240 }));
        frames.runFrame();

        expect(levelView.overlays.letterbox.bars).toHaveLength(2);
        expect(boxOnScreen(levelView, { x: 0, y: 0 })).toEqual({ x: 0, y: 30, width: 320, height: 180 });
    });

    test('a small camera in a large window zooms past the editor zoom limit', async () => {
        const { levelView, frames } = await showRedLevel(1920, 1080);

        levelView.showThroughCamera({ x: 0, y: 0 }, { width: 160, height: 90 });
        frames.runFrame();

        expect(levelView.shownView.zoom).toBe(12);
        expect(levelView.overlays.letterbox.bars).toEqual([]);
    });

    test('neither the level bounds nor the grid are drawn, whatever its switch, and the grid comes back after Stop', async () => {
        const { levelView, settings, frames } = await showRedLevel(320, 240);
        settings.set('grid', true);

        levelView.showThroughCamera({ x: 0, y: 0 }, CAMERA_BOX);
        frames.runFrame();
        expect(levelView.overlays.bounds.isShowing).toBe(false);
        expect(levelView.overlays.grid.plan).toBeUndefined();

        levelView.stopShowingThroughCamera();
        frames.runFrame();
        expect(levelView.overlays.grid.plan).toBeDefined();
    });

    test('no joint icon is drawn in play, whatever its switch, and they come back after Stop', async () => {
        const { levelView, settings, frames, level } = await showRedLevel(320, 180);
        const hinge = level.createEntity(level.world, 0);
        hinge.addComponent(new TransformComponent());
        const joint = new JointComponent();
        joint.set('type', 'hinge');
        hinge.addComponent(joint);
        frames.runFrame();
        expect(levelView.overlays.jointIcons.shownIcons).toHaveLength(1);

        levelView.showThroughCamera({ x: 0, y: 0 }, CAMERA_BOX);
        frames.runFrame();
        expect(levelView.overlays.jointIcons.shownIcons).toEqual([]);
        expect(settings.isOn('jointIcons')).toBe(true);

        levelView.stopShowingThroughCamera();
        frames.runFrame();
        expect(levelView.overlays.jointIcons.shownIcons).toHaveLength(1);
    });

    test('the editor view is left as it was, and stopping goes back to it without bars', async () => {
        const { levelView, view, frames } = await showRedLevel(320, 240);
        view.zoomAboutMiddle(0.5);
        frames.runFrame();

        levelView.showThroughCamera({ x: 400, y: 300 }, CAMERA_BOX);
        frames.runFrame();
        expect(view.zoom).toBe(0.5);
        expect(view.middle).toEqual({ x: 0, y: 0 });

        levelView.stopShowingThroughCamera();
        frames.runFrame();

        expect(levelView.shownView).toBe(view);
        expect(levelView.overlays.letterbox.bars).toEqual([]);
    });
});
