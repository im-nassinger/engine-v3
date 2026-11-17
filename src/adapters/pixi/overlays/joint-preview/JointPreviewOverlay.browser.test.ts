import { afterEach, describe, expect, test, vi } from 'vitest';
import { JointComponent, ShapeComponent, TransformComponent } from '../../../../core/components/index.ts';
import { DerivedCaches } from '../../../../core/derived/index.ts';
import { Signal, VersionCounter } from '../../../../core/events/index.ts';
import { Level } from '../../../../core/level/index.ts';
import type { Entity } from '../../../../core/level/index.ts';
import { ManualFrames } from '../../../../editor/time/testing/index.ts';
import { ViewSettings, ViewState } from '../../../../editor/view/index.ts';
import { PixiLevelView } from '../../PixiLevelView.ts';

import type { JointPreviewSource, ShownJointPreview } from './JointPreviewSource.ts';

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

class FakeJointPreview implements JointPreviewSource {
    preview: ShownJointPreview | undefined;
    linkedJoints: readonly Entity[] = [];
    private readonly changed = new VersionCounter();

    subscribe(listener: () => void) {
        return this.changed.subscribe(listener);
    }

    show(preview: ShownJointPreview | undefined, linkedJoints: readonly Entity[]) {
        this.preview = preview;
        this.linkedJoints = linkedJoints;
        this.changed.increment();
    }
}

function place(level: Level, x: number, y: number) {
    const entity = level.createEntity(level.world, 0);
    entity.addComponent(new TransformComponent({ ...TransformComponent.schema.defaults(), position: { x, y } }));

    return entity;
}

function addSquare(level: Level, x: number, y: number) {
    const square = place(level, x, y);
    square.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 20, height: 20 } }));

    return square;
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

    const source = new FakeJointPreview();
    levelView.showJointPreview(source);
    frames.runFrame();

    const drawn = () => levelView.overlays.jointPreview.drawn;

    return { view, frames, level, source, drawn };
}

describe('JointPreviewOverlay', () => {
    test('no preview and no linked joint draws nothing', async () => {
        const { drawn } = await showLevel();

        expect(drawn().label).toBeUndefined();
        expect(drawn().ends).toEqual([]);
        expect(drawn().links).toEqual([]);
    });

    test('a Hinge’s outlines, dot and label draw at three zooms, and go away with the preview', async () => {
        const { view, frames, level, source, drawn } = await showLevel();
        const car = addSquare(level, 0, 0);
        const wheel = addSquare(level, 5, 5);
        const preview: ShownJointPreview = {
            type: 'hinge',
            ends: [],
            mouse: { x: 5, y: 5 },
            a: wheel,
            b: car,
            label: 'Hinge: Wheel to Car',
        };
        source.show(preview, []);

        for (const zoom of [0.25, 1, 8]) {
            view.zoomAboutMiddle(zoom);
            frames.runFrame();

            const [wheelOutline] = drawn().outlines;
            expect(drawn().outlines).toHaveLength(2);
            // The outline grows with the zoom; the dot and the label are screen sized.
            expect(wheelOutline?.width).toBeCloseTo(20 * zoom);
            expect(drawn().ends).toEqual([view.levelToScreen({ x: 5, y: 5 })]);
            expect(drawn().label).toBe('Hinge: Wheel to Car');
            expect(drawn().pathPoints).toBe(0);
        }

        source.show(undefined, []);
        frames.runFrame();
        expect(drawn().label).toBeUndefined();
        expect(drawn().outlines).toEqual([]);
    });

    test('a Rope’s line runs from its first end to the mouse', async () => {
        const { frames, source, drawn } = await showLevel();
        const preview: ShownJointPreview = {
            type: 'rope',
            ends: [{ x: 0, y: 0 }],
            mouse: { x: 40, y: 0 },
            a: undefined,
            b: null,
            label: undefined,
        };
        source.show(preview, []);
        frames.runFrame();

        expect(drawn().pathPoints).toBe(2);
        expect(drawn().ends).toHaveLength(2);
    });

    test('a linked joint’s lines reach its entities’ centres at three zooms', async () => {
        const { view, frames, level, source, drawn } = await showLevel();
        const car = addSquare(level, -40, 0);
        const wheel = addSquare(level, 40, 0);
        const joint = place(level, 0, 20);
        const component = new JointComponent();
        component.set('a', wheel.id);
        component.set('b', car.id);
        joint.addComponent(component);
        source.show(undefined, [joint]);

        for (const zoom of [0.25, 1, 8]) {
            view.zoomAboutMiddle(zoom);
            frames.runFrame();

            expect(drawn().links).toEqual([
                [view.levelToScreen({ x: 0, y: 20 }), view.levelToScreen({ x: 40, y: 0 })],
                [view.levelToScreen({ x: 0, y: 20 }), view.levelToScreen({ x: -40, y: 0 })],
            ]);
        }
    });
});
