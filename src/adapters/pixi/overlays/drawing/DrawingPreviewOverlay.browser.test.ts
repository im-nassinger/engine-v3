import { afterEach, describe, expect, test, vi } from 'vitest';
import { DerivedCaches } from '../../../../core/derived/index.ts';
import { Signal, VersionCounter } from '../../../../core/events/index.ts';
import { Matrix2D } from '../../../../core/geometry/index.ts';
import { Level } from '../../../../core/level/index.ts';
import { ManualFrames } from '../../../../editor/time/testing/index.ts';
import { ViewSettings, ViewState } from '../../../../editor/view/index.ts';
import { PixiLevelView } from '../../PixiLevelView.ts';

import type {
    DrawingSource,
    ShownPenPreview,
    ShownPencilStroke,
    ShownPolygonPreview,
    ShownShapePreview,
} from './DrawingSource.ts';

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

class FakeDrawing implements DrawingSource {
    shape: ShownShapePreview | undefined;
    polygon: ShownPolygonPreview | undefined;
    pen: ShownPenPreview | undefined;
    pencil: ShownPencilStroke | undefined;
    private readonly changed = new VersionCounter();

    subscribe(listener: () => void) {
        return this.changed.subscribe(listener);
    }

    show(shape: ShownShapePreview | undefined, polygon: ShownPolygonPreview | undefined) {
        this.shape = shape;
        this.polygon = polygon;
        this.changed.increment();
    }

    showPen(pen: ShownPenPreview | undefined) {
        this.pen = pen;
        this.changed.increment();
    }

    showPencil(pencil: ShownPencilStroke | undefined) {
        this.pencil = pencil;
        this.changed.increment();
    }
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

    const drawing = new FakeDrawing();
    levelView.showDrawing(drawing);
    frames.runFrame();

    const drawn = () => levelView.overlays.drawingPreview.drawn;

    return { view, frames, drawing, drawn };
}

const TRIANGLE = [
    { x: -10, y: -10 },
    { x: 10, y: -10 },
    { x: 10, y: 10 },
];

describe('DrawingPreviewOverlay', () => {
    test('no preview draws nothing', async () => {
        const { drawn } = await showLevel();

        expect(drawn().filled).toBe(false);
        expect(drawn().handles).toEqual([]);
        expect(drawn().ring).toBeUndefined();
    });

    test('a rectangle preview is filled and outlined, and goes away with the preview', async () => {
        const { frames, drawing, drawn } = await showLevel();
        const geometry = { kind: 'rectangle' as const, width: 20, height: 20 };
        drawing.show(
            { drawing: { geometry, position: { x: 0, y: 0 }, rotation: 0 }, toLevel: Matrix2D.identity() },
            undefined,
        );
        frames.runFrame();

        expect(drawn().filled).toBe(true);
        expect(drawn().solidPoints).toBe(4);

        drawing.show(undefined, undefined);
        frames.runFrame();
        expect(drawn().filled).toBe(false);
    });

    test('a polygon’s handles stay 8 px and its first point’s ring 12 px at three zooms', async () => {
        const { view, frames, drawing, drawn } = await showLevel();
        const preview = { points: TRIANGLE, next: { x: -10, y: 10 }, closing: false, toLevel: Matrix2D.identity() };
        drawing.show(undefined, preview);

        for (const zoom of [0.25, 1, 8]) {
            view.zoomAboutMiddle(zoom);
            frames.runFrame();

            const [first, second] = drawn().handles;
            expect(drawn().handles).toHaveLength(2);
            expect(first?.width).toBe(8);
            expect(first?.height).toBe(8);
            // The placed points move apart with the zoom while the squares stay 8 px.
            expect((second?.top ?? 0) - (first?.top ?? 0)).toBeCloseTo(20 * zoom);
            expect(drawn().ring?.width).toBe(12);
            expect(drawn().dashedSegments).toBe(2);
            expect(drawn().filled).toBe(true);
        }
    });

    test('a click that would close the polygon marks the ring', async () => {
        const { frames, drawing, drawn } = await showLevel();
        drawing.show(undefined, {
            points: TRIANGLE,
            next: { x: -10, y: -10 },
            closing: true,
            toLevel: Matrix2D.identity(),
        });
        frames.runFrame();

        expect(drawn().closing).toBe(true);
        expect(drawn().dashedSegments).toBe(1);
    });

    test('the pen’s points keep their sizes at three zooms, the placed one square, the placing one round', async () => {
        const { view, frames, drawing, drawn } = await showLevel();
        const corner = { x: -10, y: -10, handleIn: null, handleOut: null, corner: 'sharp' as const };
        const placing = {
            x: 10,
            y: -10,
            handleIn: { x: -5, y: 0 },
            handleOut: { x: 5, y: 0 },
            corner: 'smooth' as const,
        };
        drawing.showPen({ points: [corner, placing], next: undefined, placing: 1, closing: false, ends: [] });

        for (const zoom of [0.25, 1, 8]) {
            view.zoomAboutMiddle(zoom);
            frames.runFrame();

            const path = drawn().path;
            expect(path?.squares.map((square) => square.width)).toEqual([8]);
            expect(path?.circles.map((circle) => circle.width)).toEqual([9]);
            expect(path?.filledPoints).toBe(1);
            expect(path?.handleDots.map((dot) => dot.width)).toEqual([6, 6]);
            expect(path?.ring?.width).toBe(12);
            expect(path?.makingPoints).toBeGreaterThan(2);
        }

        drawing.showPen(undefined);
        frames.runFrame();
        expect(drawn().path).toBeUndefined();
    });

    test('the Pencil’s stroke is drawn as dragged, its start ring 12 px at three zooms and filled when closing', async () => {
        const { view, frames, drawing, drawn } = await showLevel();
        const points = [
            { x: -10, y: -10 },
            { x: 10, y: -10 },
            { x: 10, y: 10 },
        ];
        drawing.showPencil({ points, closing: false });

        for (const zoom of [0.25, 1, 8]) {
            view.zoomAboutMiddle(zoom);
            frames.runFrame();

            expect(drawn().stroke?.points).toBe(3);
            expect(drawn().stroke?.ring.width).toBe(12);
            expect(drawn().stroke?.closing).toBe(false);
        }

        drawing.showPencil({ points, closing: true });
        frames.runFrame();
        expect(drawn().stroke?.closing).toBe(true);

        drawing.showPencil(undefined);
        frames.runFrame();
        expect(drawn().stroke).toBeUndefined();
    });
});
