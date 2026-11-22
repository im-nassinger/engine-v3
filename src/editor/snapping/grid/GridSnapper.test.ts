import { describe, expect, test } from 'vitest';

import { Bounds } from '../../../core/geometry/index.ts';
import { LevelEditorData } from '../../../core/level/index.ts';
import { ViewSettings, ViewState } from '../../view/index.ts';
import { GridSnapper } from './GridSnapper.ts';

const FREE = { ctrlHeld: false };
const CTRL = { ctrlHeld: true };

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

// A 30 by 30 box whose left and top sit on a grid line at 100, so its centre (115) and right (130) are off
// the 50 px lines.
const BOX = new Bounds(100, 100, 130, 130);

describe('GridSnapper.snapPoint', () => {
    test('a point lands on the nearest grid line, however far it is from one', () => {
        const { snapper } = buildSnapper();

        const result = snapper.snapPoint({ x: 24, y: -26 }, viewAt(1), FREE);

        expect(result).toEqual({ point: { x: 0, y: -50 }, snappedX: true, snappedY: true });
    });

    test('zoomed far out, a point lands on the lines still drawn', () => {
        const { snapper } = buildSnapper();

        const result = snapper.snapPoint({ x: 130, y: 120 }, viewAt(0.1), FREE);

        expect(result.point).toEqual({ x: 250, y: 0 });
    });

    test('follows the grid size', () => {
        const { snapper } = buildSnapper(100);

        const result = snapper.snapPoint({ x: 149, y: 151 }, viewAt(1), FREE);

        expect(result.point).toEqual({ x: 100, y: 200 });
    });
});

describe('GridSnapper.snapMove', () => {
    test('the edge or centre nearest a line wins on each axis', () => {
        const { snapper } = buildSnapper();
        const view = viewAt(1);

        // Moved by 32: left 132 (18 off), centre 147 (3 off), right 162 (12 off). The centre wins.
        const byCentre = snapper.snapMove(BOX, { x: 32, y: 0 }, view, FREE);
        // Moved by 18: left 118, centre 133, right 148 (2 off). The right edge wins.
        const byRight = snapper.snapMove(BOX, { x: 18, y: 0 }, view, FREE);

        expect(byCentre.point.x).toBeCloseTo(35);
        expect(byRight.point.x).toBeCloseTo(20);
    });

    test('always lands on a line, however far the drag is from one', () => {
        const { snapper } = buildSnapper();
        const box = new Bounds(0, 0, 100, 100);

        const result = snapper.snapMove(box, { x: 24, y: -26 }, viewAt(1), FREE);

        expect(result).toEqual({ point: { x: 0, y: -50 }, snappedX: true, snappedY: true });
    });
});

describe('Nothing snaps with snapping off', () => {
    test('while Ctrl is held', () => {
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
