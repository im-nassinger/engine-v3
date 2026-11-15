import { describe, expect, test } from 'vitest';

import { Bounds } from '../../core/geometry/index.ts';

import { FIT_MARGIN_PX, MAX_ZOOM, MIN_ZOOM, ViewState } from './ViewState.ts';

function viewOfSize(width: number, height: number) {
    const view = new ViewState();
    view.setSize(width, height);

    return view;
}

function expectPointClose(actual: { x: number; y: number }, expected: { x: number; y: number }) {
    expect(actual.x).toBeCloseTo(expected.x, 9);
    expect(actual.y).toBeCloseTo(expected.y, 9);
}

describe('ViewState', () => {
    test('starts at the origin at 100%', () => {
        const view = new ViewState();

        expect(view.middle).toEqual({ x: 0, y: 0 });
        expect(view.zoom).toBe(1);
    });

    test('puts the middle of the level view at the middle of the screen', () => {
        const view = viewOfSize(800, 600);

        expect(view.levelToScreen({ x: 0, y: 0 })).toEqual({ x: 400, y: 300 });
        expect(view.screenToLevel({ x: 0, y: 0 })).toEqual({ x: -400, y: -300 });
    });

    test('converts positions both ways at any zoom and pan', () => {
        const view = viewOfSize(640, 480);
        view.zoomAboutMiddle(2.5);
        view.panBy(37, -12);

        const levelPoint = { x: 123.4, y: -56.7 };
        const screenPoint = view.levelToScreen(levelPoint);

        expectPointClose(view.screenToLevel(screenPoint), levelPoint);
    });

    test('its matrix matches levelToScreen', () => {
        const view = viewOfSize(640, 480);
        view.zoomAboutMiddle(0.3);
        view.centreOn({ x: 200, y: 50 });

        const levelPoint = { x: -17, y: 99 };

        expectPointClose(view.matrix().apply(levelPoint), view.levelToScreen(levelPoint));
    });

    test('zooming keeps the point under the mouse still', () => {
        const view = viewOfSize(800, 600);
        const mouse = { x: 130, y: 470 };
        const levelUnderMouse = view.screenToLevel(mouse);

        view.zoomAt(mouse, 3.7);

        expect(view.zoom).toBe(3.7);
        expectPointClose(view.levelToScreen(levelUnderMouse), mouse);
    });

    test('zoom is clamped to 1% and 1000%', () => {
        const view = viewOfSize(800, 600);

        view.zoomAboutMiddle(50);
        expect(view.zoom).toBe(MAX_ZOOM);

        view.zoomAboutMiddle(0.0001);
        expect(view.zoom).toBe(MIN_ZOOM);
    });

    test('zooming at the mouse past the limit still keeps the point still', () => {
        const view = viewOfSize(800, 600);
        const mouse = { x: 700, y: 100 };
        const levelUnderMouse = view.screenToLevel(mouse);

        view.zoomAt(mouse, 1000);

        expect(view.zoom).toBe(MAX_ZOOM);
        expectPointClose(view.levelToScreen(levelUnderMouse), mouse);
    });

    test('zoom in and out double and halve', () => {
        const view = viewOfSize(800, 600);

        view.zoomIn();
        expect(view.zoom).toBe(2);

        view.zoomOut();
        view.zoomOut();
        expect(view.zoom).toBe(0.5);
    });

    test('panning moves the level with the drag', () => {
        const view = viewOfSize(800, 600);
        view.zoomAboutMiddle(2);

        view.panBy(100, 40);

        expect(view.middle).toEqual({ x: -50, y: -20 });
    });

    test('resizing keeps the middle', () => {
        const view = viewOfSize(800, 600);
        view.centreOn({ x: 30, y: 70 });

        view.setSize(1200, 300);

        expect(view.middle).toEqual({ x: 30, y: 70 });
        expect(view.levelToScreen({ x: 30, y: 70 })).toEqual({ x: 600, y: 150 });
    });

    test('fitting puts the rectangle in the middle with a margin', () => {
        const view = viewOfSize(880, 680);
        const rectangle = new Bounds(100, 0, 300, 100);

        view.fit(rectangle);

        expect(view.zoom).toBe(4);
        expect(view.middle).toEqual({ x: 200, y: 50 });
        expect(view.levelToScreen({ x: 100, y: 0 })).toEqual({ x: FIT_MARGIN_PX, y: 140 });
        expect(view.levelToScreen({ x: 300, y: 100 })).toEqual({ x: 880 - FIT_MARGIN_PX, y: 540 });
    });

    test('fitting a tall rectangle is limited by the height', () => {
        const view = viewOfSize(880, 680);

        view.fit(new Bounds(0, 0, 10, 300));

        expect(view.zoom).toBe(2);
    });

    test('fitting a huge or tiny rectangle stays within the zoom range', () => {
        const view = viewOfSize(800, 600);

        view.fit(new Bounds(0, 0, 1e9, 1e9));
        expect(view.zoom).toBe(MIN_ZOOM);

        view.fit(new Bounds(0, 0, 1, 1));
        expect(view.zoom).toBe(MAX_ZOOM);
    });

    test('fitting a point zooms in fully on it', () => {
        const view = viewOfSize(800, 600);

        view.fit(new Bounds(5, 6, 5, 6));

        expect(view.zoom).toBe(MAX_ZOOM);
        expect(view.middle).toEqual({ x: 5, y: 6 });
    });

    test('fitting a flat rectangle fits along its width', () => {
        const view = viewOfSize(880, 680);

        view.fit(new Bounds(0, 10, 400, 10));

        expect(view.zoom).toBe(2);
    });

    test('fitting fills only the part the panels leave free, and centres the rectangle there', () => {
        const view = viewOfSize(1000, 700);
        view.setCoveredEdges({ left: 300, top: 40, right: 100, bottom: 20 });
        const versionBefore = view.version.version;

        view.fit(new Bounds(0, 0, 520, 100));

        // The free part is 600 by 640; less the margins, 520 by 560.
        expect(view.zoom).toBe(1);
        expect(versionBefore).toBeLessThan(view.version.version);
        expectPointClose(view.levelToScreen({ x: 0, y: 0 }), { x: 300 + FIT_MARGIN_PX, y: 310 });
        expectPointClose(view.levelToScreen({ x: 520, y: 100 }), { x: 1000 - 100 - FIT_MARGIN_PX, y: 410 });
    });

    test('covering the edges moves nothing on screen', () => {
        const view = viewOfSize(800, 600);
        const versionBefore = view.version.version;

        view.setCoveredEdges({ left: 200, top: 0, right: 0, bottom: -5 });

        expect(view.version.version).toBe(versionBefore);
        expect(view.middle).toEqual({ x: 0, y: 0 });
        expect(view.coveredEdges.bottom).toBe(0);
    });

    test('fitting nothing leaves the view alone', () => {
        const view = viewOfSize(800, 600);
        view.centreOn({ x: 10, y: 20 });
        const versionBefore = view.version.version;

        view.fit(undefined);

        expect(view.middle).toEqual({ x: 10, y: 20 });
        expect(view.version.version).toBe(versionBefore);
    });

    test('panning stops at the World rectangle grown by its larger side', () => {
        const view = viewOfSize(800, 600);
        view.setPanLimit(new Bounds(-500, -200, 500, 200));

        view.panBy(-1e7, 1e7);

        expect(view.middle).toEqual({ x: 1500, y: -1200 });
    });

    test('a new pan limit pulls the middle inside it', () => {
        const view = viewOfSize(800, 600);
        view.centreOn({ x: 9000, y: 0 });

        view.setPanLimit(new Bounds(-100, -100, 100, 100));

        expect(view.middle).toEqual({ x: 300, y: 0 });
    });

    test('no pan limit lets the view go anywhere', () => {
        const view = viewOfSize(800, 600);
        view.setPanLimit(new Bounds(-100, -100, 100, 100));
        view.setPanLimit(undefined);

        view.centreOn({ x: 9000, y: 0 });

        expect(view.middle).toEqual({ x: 9000, y: 0 });
    });

    test('the view holds nothing when it misses the level contents', () => {
        const view = viewOfSize(800, 600);
        const contents = new Bounds(-100, -100, 100, 100);

        expect(view.holdsNothing(contents)).toBe(false);

        view.centreOn({ x: 1000, y: 0 });
        expect(view.holdsNothing(contents)).toBe(true);

        expect(view.holdsNothing(undefined)).toBe(true);
    });

    test('visible bounds follow the zoom', () => {
        const view = viewOfSize(800, 600);
        view.zoomAboutMiddle(2);

        const visible = view.visibleBounds();

        expect(visible).toEqual(new Bounds(-200, -150, 200, 150));
    });

    test('the version moves only on a real change', () => {
        const view = viewOfSize(800, 600);
        let notified = 0;
        view.version.subscribe(() => {
            notified += 1;
        });

        view.setSize(800, 600);
        view.panBy(0, 0);
        view.zoomAboutMiddle(1);
        expect(notified).toBe(0);

        view.panBy(1, 0);
        view.zoomIn();
        view.setSize(801, 600);
        expect(notified).toBe(3);
    });

    test('a negative size counts as no size', () => {
        const view = viewOfSize(-5, -5);

        expect(view.size).toEqual({ width: 0, height: 0 });
    });
});
