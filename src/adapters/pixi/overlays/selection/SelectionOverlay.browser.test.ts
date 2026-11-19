import { afterEach, describe, expect, test, vi } from 'vitest';
import { JointComponent, ShapeComponent, TransformComponent } from '../../../../core/components/index.ts';
import { DerivedCaches } from '../../../../core/derived/index.ts';
import { Bounds } from '../../../../core/geometry/index.ts';
import type { Point } from '../../../../core/geometry/index.ts';
import { Level } from '../../../../core/level/index.ts';
import type { Entity } from '../../../../core/level/index.ts';
import { Signal, VersionCounter } from '../../../../core/events/index.ts';
import { ManualFrames } from '../../../../editor/time/testing/index.ts';
import { ViewSettings, ViewState } from '../../../../editor/view/index.ts';
import { PixiLevelView } from '../../PixiLevelView.ts';

import type { SelectionSource, ShownFrame, ShownPoints, ShownReadout } from './SelectionSource.ts';

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

class FakeSelection implements SelectionSource {
    entities: readonly Entity[] = [];
    frame: ShownFrame | undefined;
    selectionBox: Bounds | undefined;
    readout: ShownReadout | undefined;
    editedPoints: ShownPoints | undefined;
    private readonly changed = new VersionCounter();
    private readonly caches: DerivedCaches;

    constructor(caches: DerivedCaches) {
        this.caches = caches;
    }

    isHidden(entity: Entity) {
        return this.caches.hidden.isHidden(entity);
    }

    isLocked(entity: Entity) {
        return this.caches.hidden.isLocked(entity);
    }

    subscribe(listener: () => void) {
        return this.changed.subscribe(listener);
    }

    select(entities: readonly Entity[], frame?: ShownFrame) {
        this.entities = entities;
        this.frame = frame;
        this.changed.increment();
    }
}

// The frame of an axis-aligned box in level positions.
function frameOf(box: Bounds): ShownFrame {
    const { left, top, right, bottom } = box;
    const { x: midX, y: midY } = box.centre;
    const handles: Point[] = [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
        { x: midX, y: top },
        { x: right, y: midY },
        { x: midX, y: bottom },
        { x: left, y: midY },
    ];

    return { corners: box.corners(), handles };
}

async function showLevel() {
    const view = new ViewState();
    const frames = new ManualFrames();
    const pixelRatio = {
        current: () => 1,
        onChange: (listener: (ratio: number) => void) => new Signal<number>().subscribe(listener),
    };
    const levelView = await PixiLevelView.create({
        view,
        settings: new ViewSettings(),
        frames,
        pixelRatio,
        drawing: { showUnstyled: true },
    });
    cleanups.push(() => levelView.destroy());

    const host = document.createElement('div');
    host.style.width = '300px';
    host.style.height = '200px';
    document.body.appendChild(host);
    cleanups.push(() => host.remove());
    levelView.mount(host);
    await vi.waitFor(() => expect(view.size).toEqual({ width: 300, height: 200 }));

    const level = Level.createNew();
    const caches = new DerivedCaches(level);
    cleanups.push(() => caches.dispose());
    levelView.show(level, caches);

    const selection = new FakeSelection(caches);
    levelView.showSelection(selection);
    frames.runFrame();

    const drawn = () => levelView.overlays.selection.drawn;

    return { level, levelView, view, frames, selection, drawn };
}

function place(level: Level, parent: Entity, x: number, y: number) {
    const entity = level.createEntity(parent, 0);
    const transform = new TransformComponent();
    transform.set('position', { x, y });
    entity.addComponent(transform);

    return entity;
}

function addShape(level: Level, parent: Entity, x: number, y: number) {
    const entity = place(level, parent, x, y);
    entity.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 20, height: 20 } }));

    return entity;
}

describe('SelectionOverlay', () => {
    test('a handle is white inside with an edge in the accent colour', async () => {
        const { level, levelView, frames, selection } = await showLevel();
        // On half pixels, so the handle's 1.5 px edge covers a whole column of pixels.
        selection.select([addShape(level, level.world, 0, 0)], frameOf(new Bounds(-19.5, -19.5, 19.5, 19.5)));
        frames.runFrame();

        const { pixels, width } = levelView.readPixels();
        const colourAt = (x: number, y: number) => [...pixels.slice((y * width + x) * 4, (y * width + x) * 4 + 3)];

        expect(colourAt(130, 80)).toEqual([0xff, 0xff, 0xff]);
        expect(colourAt(126, 80)).toEqual([0x4f, 0x8c, 0xff]);
    });

    test('nothing selected draws nothing', async () => {
        const { drawn } = await showLevel();

        expect(drawn().outlines).toBe(0);
        expect(drawn().handles).toEqual([]);
    });

    test('a selection change draws again on the next frame', async () => {
        const { level, frames, selection, drawn } = await showLevel();
        const shape = addShape(level, level.world, 0, 0);
        frames.runFrame();

        selection.select([shape]);
        expect(frames.pendingCount).toBe(1);
        frames.runFrame();

        expect(drawn().outlines).toBe(1);
    });

    test('one shape: its outline and a box with eight handles', async () => {
        const { level, frames, selection, drawn } = await showLevel();
        const shape = addShape(level, level.world, 0, 0);
        selection.select([shape], frameOf(new Bounds(-10, -10, 10, 10)));
        frames.runFrame();

        expect(drawn().outlines).toBe(1);
        expect(drawn().handles).toHaveLength(8);
        expect(drawn().sharedBox).toBeUndefined();
    });

    test('one group: a box with handles and no outline', async () => {
        const { level, frames, selection, drawn } = await showLevel();
        const group = place(level, level.world, 0, 0);
        addShape(level, group, 0, 0);
        selection.select([group], frameOf(new Bounds(-10, -10, 10, 10)));
        frames.runFrame();

        expect(drawn().outlines).toBe(0);
        expect(drawn().handles).toHaveLength(8);
    });

    test('several entities: an outline each and one shared box, no handles', async () => {
        const { level, frames, selection, drawn } = await showLevel();
        const left = addShape(level, level.world, -50, 0);
        const right = addShape(level, level.world, 50, 0);
        selection.select([left, right]);
        frames.runFrame();

        expect(drawn().outlines).toBe(2);
        expect(drawn().handles).toEqual([]);
        expect(drawn().sharedBox).toMatchObject({ left: 90, top: 90, right: 210, bottom: 110 });
    });

    test('a joint: a ring around its icon', async () => {
        const { level, frames, selection, drawn } = await showLevel();
        const joint = place(level, level.world, 0, 0);
        joint.addComponent(new JointComponent());
        selection.select([joint]);
        frames.runFrame();

        expect(drawn().rings).toBe(1);
    });

    test('the camera: a heavier frame', async () => {
        const { level, frames, selection, drawn } = await showLevel();
        selection.select([level.camera]);
        frames.runFrame();

        expect(drawn().cameraFrames).toBe(1);
    });

    test('a locked entity: a plain outline and a padlock, no handles', async () => {
        const { level, frames, selection, drawn } = await showLevel();
        const shape = addShape(level, level.world, 0, 0);
        shape.setLocked(true);
        selection.select([shape]);
        frames.runFrame();

        expect(drawn().outlines).toBe(1);
        expect(drawn().padlocks).toBe(1);
        expect(drawn().handles).toEqual([]);
    });

    test('only hidden entities: a dashed box where they are', async () => {
        const { level, frames, selection, drawn } = await showLevel();
        const shape = addShape(level, level.world, 0, 0);
        shape.setHidden(true);
        selection.select([shape]);
        frames.runFrame();

        expect(drawn().outlines).toBe(0);
        expect(drawn().hiddenBox).toMatchObject({ left: 140, top: 90, right: 160, bottom: 110 });
    });

    test('handles keep their size at three zooms', async () => {
        const { level, view, frames, selection, drawn } = await showLevel();
        const shape = addShape(level, level.world, 0, 0);
        selection.select([shape], frameOf(new Bounds(-10, -10, 10, 10)));

        for (const zoom of [0.25, 1, 8]) {
            view.zoomAboutMiddle(zoom);
            frames.runFrame();

            const [first, second] = drawn().handles;
            expect(first?.width).toBe(8);
            expect(first?.height).toBe(8);
            // The corners move apart with the zoom while the squares stay 8 px.
            expect((second?.left ?? 0) - (first?.left ?? 0)).toBeCloseTo(20 * zoom);
        }
    });

    test('501 selected draws one box and a count, no outlines', async () => {
        const { level, frames, selection, drawn } = await showLevel();
        const shapes = Array.from({ length: 501 }, (_, i) => addShape(level, level.world, i % 50, 0));
        selection.select(shapes);
        frames.runFrame();

        expect(drawn().outlines).toBe(0);
        expect(drawn().sharedBox).toBeDefined();
        expect(drawn().count).toBe('501 selected');
    });

    test('the selection box being dragged and the readout are drawn, and handles hide during the drag', async () => {
        const { level, frames, selection, drawn } = await showLevel();
        const shape = addShape(level, level.world, 0, 0);
        selection.select([shape]);
        selection.selectionBox = new Bounds(0, 0, 40, 20);
        selection.readout = { text: '120, −40 px', at: { x: 0, y: 0 } };
        selection.select([shape], undefined);
        frames.runFrame();

        expect(drawn().selectionBox).toMatchObject({ left: 150, top: 100, right: 190, bottom: 120 });
        expect(drawn().readout).toBe('120, −40 px');
        expect(drawn().handles).toEqual([]);
    });

    test('edited points draw as 8 px handles at three zooms, the selected ones counted', async () => {
        const { level, view, frames, selection, drawn } = await showLevel();
        const shape = addShape(level, level.world, 0, 0);
        selection.editedPoints = {
            points: [
                { x: -10, y: -10 },
                { x: 10, y: -10 },
                { x: 10, y: 10 },
            ],
            selected: [1],
        };
        selection.select([shape], undefined);

        for (const zoom of [0.25, 1, 8]) {
            view.zoomAboutMiddle(zoom);
            frames.runFrame();

            const [first, second] = drawn().points;
            expect(drawn().points).toHaveLength(3);
            expect(first?.width).toBe(8);
            expect(first?.height).toBe(8);
            expect((second?.left ?? 0) - (first?.left ?? 0)).toBeCloseTo(20 * zoom);
        }
        expect(drawn().selectedPoints).toBe(1);
        expect(drawn().handles).toEqual([]);
    });

    test('no point handles when no points are edited', async () => {
        const { level, frames, selection, drawn } = await showLevel();
        selection.select([addShape(level, level.world, 0, 0)]);
        frames.runFrame();

        expect(drawn().points).toEqual([]);
        expect(drawn().selectedPoints).toBe(0);
    });
});
