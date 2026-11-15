import { describe, expect, test } from 'vitest';

import { Bounds } from '../../../core/geometry/index.ts';
import { LevelEditorData } from '../../../core/level/index.ts';
import { ViewSettings, ViewState } from '../../view/index.ts';
import { GridSnapper, SNAP_DISTANCE_PX } from './GridSnapper.ts';

const FREE = { ctrlHeld: false };
const CTRL = { ctrlHeld: true };
const ZOOMS = [0.5, 1, 4];

function buildSnapper(gridSize = 50) {
    const editorData = new LevelEditorData();
    editorData.setGridSize(gridSize);
    const settings = new ViewSettings();
    const snapper = new GridSnapper(editorData, settings);

    return { snapper, settings };
}

function viewAt(zoom: number) {
    const view = new ViewState();
    view.setSize(800, 600);
    view.zoomAboutMiddle(zoom);

    return view;
}

// A 30 by 30 box whose left and top sit on the grid line at 100, so its centre (115) and right (130)
// are off the 50 px grid.
const BOX = new Bounds(100, 100, 130, 130);

describe('GridSnapper.snapPoint', () => {
    test('snaps within 6 screen px at three zooms and not at 7', () => {
        const { snapper } = buildSnapper();

        for (const zoom of ZOOMS) {
            const view = viewAt(zoom);
            const near = 150 + SNAP_DISTANCE_PX / zoom;
            const far = 150 + 7 / zoom;

            const snapped = snapper.snapPoint({ x: near, y: -near }, view, FREE);
            const missed = snapper.snapPoint({ x: far, y: -far }, view, FREE);

            expect(snapped.point.x).toBeCloseTo(150);
            expect(snapped.point.y).toBeCloseTo(-150);
            expect(snapped.snappedX && snapped.snappedY).toBe(true);
            expect(missed.point).toEqual({ x: far, y: -far });
            expect(missed.snappedX || missed.snappedY).toBe(false);
        }
    });

    test('snaps each axis on its own', () => {
        const { snapper } = buildSnapper();

        const result = snapper.snapPoint({ x: 52, y: 75 }, viewAt(1), FREE);

        expect(result).toEqual({ point: { x: 50, y: 75 }, snappedX: true, snappedY: false });
    });

    test('follows the grid size', () => {
        const { snapper } = buildSnapper(10);

        const result = snapper.snapPoint({ x: 23, y: 37 }, viewAt(1), FREE);

        expect(result.point).toEqual({ x: 20, y: 40 });
    });
});

describe('GridSnapper.snapMove', () => {
    test('the nearest of the edges and centre wins', () => {
        const { snapper } = buildSnapper();

        // Moved by 32: left 132 (18 off), centre 147 (3 off), right 162 (12 off). The centre wins.
        const byCentre = snapper.snapMove(BOX, { x: 32, y: 0 }, viewAt(0.25), FREE);
        // Moved by 18: left 118, centre 133, right 148 (2 off). The right edge wins.
        const byRight = snapper.snapMove(BOX, { x: 18, y: 0 }, viewAt(0.25), FREE);

        expect(byCentre.point.x).toBeCloseTo(35);
        expect(byRight.point.x).toBeCloseTo(20);
    });

    test('snaps an edge within 6 screen px at three zooms and not at 7', () => {
        const { snapper } = buildSnapper();

        for (const zoom of [1, 2, 4]) {
            const view = viewAt(zoom);
            const nearOffset = { x: SNAP_DISTANCE_PX / zoom, y: -SNAP_DISTANCE_PX / zoom };
            const farOffset = { x: 7 / zoom, y: -7 / zoom };
            // Only the left and top edges come within 7 px of a grid line; the centre (35) and the right
            // and bottom (70) stay further away.
            const box = new Bounds(0, 0, 70, 70);

            const snapped = snapper.snapMove(box, nearOffset, view, FREE);
            const missed = snapper.snapMove(box, farOffset, view, FREE);

            expect(snapped.point.x).toBeCloseTo(0);
            expect(snapped.point.y).toBeCloseTo(0);
            expect(missed.point).toEqual(farOffset);
            expect(missed.snappedX || missed.snappedY).toBe(false);
        }
    });

    test('leaves an axis with nothing in reach alone', () => {
        const { snapper } = buildSnapper();

        const result = snapper.snapMove(BOX, { x: 2, y: 10 }, viewAt(1), FREE);

        expect(result).toEqual({ point: { x: 0, y: 10 }, snappedX: true, snappedY: false });
    });
});

describe('Nothing snaps with snapping off', () => {
    test('with Ctrl held', () => {
        const { snapper } = buildSnapper();
        const view = viewAt(1);

        const moved = snapper.snapMove(BOX, { x: 2, y: 2 }, view, CTRL);
        const point = snapper.snapPoint({ x: 52, y: 52 }, view, CTRL);

        expect(moved).toEqual({ point: { x: 2, y: 2 }, snappedX: false, snappedY: false });
        expect(point).toEqual({ point: { x: 52, y: 52 }, snappedX: false, snappedY: false });
    });

    test('with the grid snapping switch off, and again once it is back on', () => {
        const { snapper, settings } = buildSnapper();
        const view = viewAt(1);

        settings.set('gridSnapping', false);
        const whileOff = snapper.snapPoint({ x: 52, y: 52 }, view, FREE);
        settings.set('gridSnapping', true);
        const whileOn = snapper.snapPoint({ x: 52, y: 52 }, view, FREE);

        expect(whileOff.point).toEqual({ x: 52, y: 52 });
        expect(whileOn.point).toEqual({ x: 50, y: 50 });
    });

    test('the grid being hidden does not stop snapping', () => {
        const { snapper, settings } = buildSnapper();

        settings.set('grid', false);
        const result = snapper.snapPoint({ x: 52, y: 52 }, viewAt(1), FREE);

        expect(result.point).toEqual({ x: 50, y: 50 });
    });
});
