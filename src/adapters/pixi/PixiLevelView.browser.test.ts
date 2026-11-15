import { afterEach, describe, expect, test, vi } from 'vitest';
import {
    CameraComponent,
    JointComponent,
    PhysicsWorldComponent,
    ShapeComponent,
    StyleComponent,
    SurfaceComponent,
    TransformComponent,
} from '../../core/components/index.ts';
import type { Entity } from '../../core/entities/index.ts';
import type { ShapeGeometry } from '../../core/geometry/index.ts';
import { BoundsCache, PiecesCache, WorldMatrixCache } from '../../core/derived/index.ts';
import { Level } from '../../core/entities/index.ts';
import { Signal } from '../../core/events/index.ts';
import { ManualFrames } from '../../editor/time/testing/index.ts';
import { ViewSettings, ViewState } from '../../editor/view/index.ts';
import { PixiLevelView } from './PixiLevelView.ts';
import type { PixelRatioSource } from './PixiLevelView.ts';

class FakePixelRatio implements PixelRatioSource {
    private ratio: number;
    private readonly changed = new Signal<number>();

    constructor(ratio: number) {
        this.ratio = ratio;
    }

    current() {
        return this.ratio;
    }

    onChange(listener: (ratio: number) => void) {
        return this.changed.subscribe(listener);
    }

    change(ratio: number) {
        this.ratio = ratio;
        this.changed.emit(ratio);
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

function makeCaches(level: Level) {
    const pieces = new PiecesCache(level);
    const worldMatrices = new WorldMatrixCache(level);
    const bounds = new BoundsCache(level, worldMatrices);
    cleanups.push(() => {
        bounds.dispose();
        worldMatrices.dispose();
        pieces.dispose();
    });

    return { pieces, bounds, worldMatrices };
}

async function makeView(ratio = 1) {
    const view = new ViewState();
    const frames = new ManualFrames();
    const settings = new ViewSettings();
    const pixelRatio = new FakePixelRatio(ratio);
    const drawing = { showUnstyled: true };
    const levelView = await PixiLevelView.create({ view, settings, frames, pixelRatio, drawing });
    cleanups.push(() => levelView.destroy());

    return { levelView, view, settings, frames, pixelRatio };
}

async function waitForSize(view: ViewState, width: number, height: number) {
    await vi.waitFor(() => expect(view.size).toEqual({ width, height }));
}

describe('PixiLevelView', () => {
    test('mount puts the canvas in the host at the host size', async () => {
        const { levelView, view } = await makeView();
        const host = makeHost(300, 200);

        levelView.mount(host);
        await waitForSize(view, 300, 200);

        expect(levelView.canvas.parentElement).toBe(host);
        expect(levelView.canvas.style.width).toBe('300px');
        expect(levelView.canvas.style.height).toBe('200px');
    });

    test('the canvas follows the host when it changes size', async () => {
        const { levelView, view } = await makeView();
        const host = makeHost(300, 200);

        levelView.mount(host);
        await waitForSize(view, 300, 200);

        host.style.width = '420px';
        host.style.height = '150px';
        await waitForSize(view, 420, 150);

        expect(levelView.canvas.style.width).toBe('420px');
        expect(levelView.canvas.style.height).toBe('150px');
    });

    test('the canvas has the pixels of its size times the device pixel ratio', async () => {
        const { levelView, view } = await makeView(2);
        const host = makeHost(300, 200);

        levelView.mount(host);
        await waitForSize(view, 300, 200);

        expect(levelView.resolution).toBe(2);
        expect(levelView.canvas.width).toBe(600);
        expect(levelView.canvas.height).toBe(400);
    });

    test('a new device pixel ratio changes the resolution and draws again', async () => {
        const { levelView, view, frames, pixelRatio } = await makeView(1);
        const host = makeHost(300, 200);

        levelView.mount(host);
        await waitForSize(view, 300, 200);
        frames.runFrame();

        pixelRatio.change(1.5);

        expect(levelView.resolution).toBe(1.5);
        expect(levelView.canvas.width).toBe(450);
        expect(levelView.canvas.height).toBe(300);
        expect(levelView.canvas.style.width).toBe('300px');
        expect(frames.pendingCount).toBe(1);
    });

    test('an idle view asks for no frame and renders nothing', async () => {
        const { levelView, view, frames } = await makeView();
        const host = makeHost(300, 200);

        levelView.mount(host);
        await waitForSize(view, 300, 200);
        frames.runFrame();
        const rendersAfterMount = levelView.renderCount;

        await new Promise((resolve) => setTimeout(resolve, 50));
        frames.runFrame();
        frames.runFrame();

        expect(frames.pendingCount).toBe(0);
        expect(levelView.renderCount).toBe(rendersAfterMount);
    });

    test('several changes before a frame draw once', async () => {
        const { levelView, view, frames } = await makeView();
        const host = makeHost(300, 200);

        levelView.mount(host);
        await waitForSize(view, 300, 200);
        frames.runFrame();
        const rendersBefore = levelView.renderCount;

        view.panBy(10, 0);
        view.zoomIn();
        levelView.markDirty();

        expect(frames.pendingCount).toBe(1);

        frames.runFrame();

        expect(levelView.renderCount).toBe(rendersBefore + 1);
        expect(frames.pendingCount).toBe(0);
    });

    test('unmount takes the canvas out and stops following the host', async () => {
        const { levelView, view } = await makeView();
        const host = makeHost(300, 200);

        levelView.mount(host);
        await waitForSize(view, 300, 200);
        levelView.unmount();
        host.style.width = '500px';
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(levelView.canvas.parentElement).toBeNull();
        expect(view.size).toEqual({ width: 300, height: 200 });
    });

    test('mounting in another host moves the canvas there', async () => {
        const { levelView, view } = await makeView();
        const firstHost = makeHost(300, 200);
        const secondHost = makeHost(120, 80);

        levelView.mount(firstHost);
        await waitForSize(view, 300, 200);
        levelView.mount(secondHost);
        await waitForSize(view, 120, 80);

        expect(levelView.canvas.parentElement).toBe(secondHost);
        expect(firstHost.childElementCount).toBe(0);
    });

    test('show draws the level, and a change to it draws once more with the drawing rebuilt', async () => {
        const { levelView, view, frames } = await makeView();
        const host = makeHost(300, 200);
        levelView.mount(host);
        await waitForSize(view, 300, 200);
        frames.runFrame();

        const level = Level.createNew();
        levelView.show(level, makeCaches(level));

        expect(frames.pendingCount).toBe(1);
        frames.runFrame();
        const buildsAfterShow = levelView.levelDisplay?.drawingBuildCount ?? 0;

        const square = level.createEntity(level.world, 0);
        square.addComponent(new TransformComponent());
        square.addComponent(new ShapeComponent());
        square.addComponent(new StyleComponent());
        const rendersBefore = levelView.renderCount;

        expect(frames.pendingCount).toBe(1);
        frames.runFrame();

        expect(levelView.renderCount).toBe(rendersBefore + 1);
        expect(levelView.levelDisplay?.drawingBuildCount).toBe(buildsAfterShow + 1);
    });

    test('each render culls to what the view shows, so panning to an entity shows it', async () => {
        const { levelView, view, frames } = await makeView();
        const host = makeHost(300, 200);
        levelView.mount(host);
        await waitForSize(view, 300, 200);

        const level = Level.createNew();
        const farSquare = level.createEntity(level.world, 0);
        farSquare.addComponent(new TransformComponent());
        farSquare.addComponent(new ShapeComponent());
        farSquare.addComponent(new StyleComponent());
        farSquare.requireComponent(TransformComponent).set('position', { x: 1000, y: 0 });
        levelView.show(level, makeCaches(level));
        frames.runFrame();

        const node = levelView.levelDisplay?.nodeOf(farSquare);
        expect(node?.container.renderable).toBe(false);

        view.centreOn({ x: 1000, y: 0 });
        frames.runFrame();

        expect(node?.container.renderable).toBe(true);
    });

    test('showing another level lets go of the first one', async () => {
        const { levelView, frames } = await makeView();
        const firstLevel = Level.createNew();
        const secondLevel = Level.createNew();
        levelView.show(firstLevel, makeCaches(firstLevel));
        levelView.show(secondLevel, makeCaches(secondLevel));
        frames.runFrame();
        firstLevel.createEntity(firstLevel.world, 0);

        expect(frames.pendingCount).toBe(0);
        expect(levelView.levelDisplay?.nodeOf(secondLevel.world)).toBeDefined();
    });
});

describe('PixiLevelView overlays', () => {
    async function showNewLevel() {
        const parts = await makeView();
        const host = makeHost(300, 200);
        parts.levelView.mount(host);
        await waitForSize(parts.view, 300, 200);

        const level = Level.createNew();
        parts.levelView.show(level, makeCaches(level));
        parts.frames.runFrame();

        return { ...parts, level, overlays: parts.levelView.overlays };
    }

    test('the grid draws a step every 50 px and its switch hides it', async () => {
        const { settings, frames, overlays } = await showNewLevel();

        expect(overlays.grid.graphics.visible).toBe(true);
        expect(overlays.grid.plan?.spacing).toEqual({ step: 50, fineStep: 10 });

        settings.toggle('grid');
        expect(frames.pendingCount).toBe(1);
        frames.runFrame();

        expect(overlays.grid.graphics.visible).toBe(false);
        expect(overlays.grid.plan).toBeUndefined();
    });

    test('a new grid size draws again with the new step', async () => {
        const { level, frames, overlays } = await showNewLevel();

        level.editorData.setGridSize(100);
        expect(frames.pendingCount).toBe(1);
        frames.runFrame();

        expect(overlays.grid.plan?.spacing).toEqual({ step: 100, fineStep: 20 });
    });

    test('zoomed out, the fainter lines are left out', async () => {
        const { view, frames, overlays } = await showNewLevel();

        view.zoomAboutMiddle(0.5);
        frames.runFrame();

        expect(overlays.grid.plan?.spacing).toEqual({ step: 50, fineStep: undefined });
    });

    test('the outside of the level bounds is dimmed, and nothing when the level fills the view', async () => {
        const { level, frames, overlays } = await showNewLevel();
        expect(overlays.bounds.dimmedAreas).toEqual([]);

        level.world.requireComponent(ShapeComponent).set('geometry', { kind: 'rectangle', width: 200, height: 100 });
        frames.runFrame();

        const areas = overlays.bounds.dimmedAreas;
        const dimmedPixels = areas.reduce((sum, area) => sum + area.width * area.height, 0);
        expect(areas).toHaveLength(4);
        expect(dimmedPixels).toBe(300 * 200 - 200 * 100);
    });

    test('the camera frame shows its size and hides with its switch or the camera', async () => {
        const { level, settings, frames, overlays } = await showNewLevel();

        expect(overlays.cameraFrame.isShowing).toBe(true);
        expect(overlays.cameraFrame.labelText).toBe('Camera 1920 × 1080');

        level.camera.requireComponent(CameraComponent).set('width', 800);
        frames.runFrame();
        expect(overlays.cameraFrame.labelText).toBe('Camera 800 × 1080');

        settings.set('cameraFrame', false);
        frames.runFrame();
        expect(overlays.cameraFrame.isShowing).toBe(false);

        settings.set('cameraFrame', true);
        level.camera.setHidden(true);
        frames.runFrame();
        expect(overlays.cameraFrame.isShowing).toBe(false);
    });
    function placeAt(level: Level, parent: Entity, x: number, y: number) {
        const entity = level.createEntity(parent, 0);
        const transform = new TransformComponent();
        transform.set('position', { x, y });
        entity.addComponent(transform);

        return entity;
    }

    function addJoint(level: Level, x: number, y: number, type: 'hinge' | 'rope' | 'spring') {
        const entity = placeAt(level, level.world, x, y);
        const joint = new JointComponent();
        joint.set('type', type);
        entity.addComponent(joint);

        return entity;
    }

    function addCollidingShape(level: Level, parent: Entity, x: number, y: number, geometry: ShapeGeometry) {
        const entity = placeAt(level, parent, x, y);
        entity.addComponent(new ShapeComponent({ geometry }));
        entity.addComponent(new SurfaceComponent());

        return entity;
    }

    test('a joint icon sits at its position with the same size at any zoom, one per type', async () => {
        const { level, view, frames, overlays } = await showNewLevel();
        addJoint(level, 10, 20, 'hinge');
        addJoint(level, -40, 0, 'rope');
        addJoint(level, 0, -30, 'spring');
        frames.runFrame();

        const types = overlays.jointIcons.shownIcons.map((icon) => icon.type);
        expect(types.sort()).toEqual(['hinge', 'rope', 'spring']);
        const hinge = overlays.jointIcons.shownIcons.find((icon) => icon.type === 'hinge');
        expect(hinge?.screenPosition).toEqual({ x: 160, y: 120 });
        view.zoomAboutMiddle(4);
        frames.runFrame();

        const zoomedHinge = overlays.jointIcons.shownIcons.find((icon) => icon.type === 'hinge');
        expect(zoomedHinge?.screenPosition).toEqual({ x: 190, y: 180 });
    });

    test('a joint icon keeps its size on screen at any zoom', async () => {
        const { level, view, frames, overlays } = await showNewLevel();
        addJoint(level, 0, 0, 'hinge');
        frames.runFrame();
        const widthAtFirst = overlays.jointIcons.graphics.getLocalBounds().width;

        view.zoomAboutMiddle(8);
        frames.runFrame();

        expect(widthAtFirst).toBeGreaterThanOrEqual(14);
        expect(widthAtFirst).toBeLessThan(17);
        expect(overlays.jointIcons.graphics.getLocalBounds().width).toBe(widthAtFirst);
    });

    test('joint icons hide with their switch, the eye and a hidden parent', async () => {
        const { level, settings, frames, overlays } = await showNewLevel();
        const group = placeAt(level, level.world, 0, 0);
        const joint = addJoint(level, 0, 0, 'hinge');
        level.moveEntity(joint, group, 0);
        frames.runFrame();
        expect(overlays.jointIcons.shownIcons).toHaveLength(1);

        group.setHidden(true);
        frames.runFrame();
        expect(overlays.jointIcons.shownIcons).toHaveLength(0);

        group.setHidden(false);
        settings.set('jointIcons', false);
        frames.runFrame();
        expect(overlays.jointIcons.graphics.visible).toBe(false);
        expect(overlays.jointIcons.shownIcons).toHaveLength(0);
    });

    test('the physics view is off at first and draws hidden and see-through shapes too', async () => {
        const { level, settings, frames, overlays } = await showNewLevel();
        const box = addCollidingShape(level, level.world, 0, 0, { kind: 'rectangle', width: 40, height: 20 });
        const ball = addCollidingShape(level, level.world, 50, 0, { kind: 'ellipse', width: 30, height: 30 });
        addCollidingShape(level, level.world, 0, 50, {
            kind: 'line',
            points: [
                { x: 0, y: 0 },
                { x: 60, y: 0 },
            ],
        });
        placeAt(level, level.world, 0, 0).addComponent(
            new ShapeComponent({ geometry: { kind: 'rectangle', width: 10, height: 10 } }),
        );
        frames.runFrame();
        expect(overlays.physicsView.graphics.visible).toBe(false);
        expect(overlays.physicsView.drawnPieceCount).toBe(0);

        settings.set('physicsView', true);
        frames.runFrame();
        expect(overlays.physicsView.drawnPieceCount).toBe(3);

        box.setHidden(true);
        ball.addComponent(new StyleComponent());
        ball.requireComponent(StyleComponent).set('opacity', 0);
        frames.runFrame();
        expect(overlays.physicsView.drawnPieceCount).toBe(3);
    });

    test('the physics view leaves out shapes off screen and draws the walls when on', async () => {
        const { level, settings, frames, overlays } = await showNewLevel();
        settings.set('physicsView', true);
        addCollidingShape(level, level.world, 5000, 0, { kind: 'rectangle', width: 40, height: 20 });
        frames.runFrame();
        expect(overlays.physicsView.drawnPieceCount).toBe(0);

        level.world.requireComponent(PhysicsWorldComponent).set('walls', true);
        frames.runFrame();
        expect(overlays.physicsView.drawnPieceCount).toBe(1);
    });
});
