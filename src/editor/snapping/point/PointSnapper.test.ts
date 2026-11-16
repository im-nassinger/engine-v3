import { describe, expect, test } from 'vitest';

import { ShapeComponent, TransformComponent } from '../../../core/components/index.ts';
import { DerivedCaches } from '../../../core/derived/index.ts';
import type { Point, ShapeGeometry } from '../../../core/geometry/index.ts';
import { Level } from '../../../core/level/index.ts';
import { ViewState } from '../../view/index.ts';
import type { SnapResult, Snapper } from '../Snapper.ts';
import { PointSnapper } from './PointSnapper.ts';

const FREE = { ctrlHeld: false };
const CTRL = { ctrlHeld: true };

// Rounds to the nearest 10, standing in for the grid.
const TENS: Snapper = {
    snapMove: (_bounds, offset): SnapResult => ({ point: offset, snappedX: false, snappedY: false }),
    snapPoint: (point): SnapResult => ({
        point: { x: Math.round(point.x / 10) * 10, y: Math.round(point.y / 10) * 10 },
        snappedX: true,
        snappedY: true,
    }),
};

function buildSnapper() {
    const level = Level.createNew();
    const caches = new DerivedCaches(level);
    const add = (position: Point, geometry: ShapeGeometry, rotation = 0) => {
        const entity = level.createEntity(level.world, 0);
        entity.addComponent(new TransformComponent({ ...TransformComponent.schema.defaults(), position, rotation }));
        entity.addComponent(new ShapeComponent({ geometry }));

        return entity;
    };

    return { add, snapper: new PointSnapper(caches, TENS) };
}

function viewAt(zoom: number) {
    const view = new ViewState();
    view.setSize(800, 600);
    view.zoomAboutMiddle(zoom);

    return view;
}

describe('PointSnapper', () => {
    test('snaps to a centre or a corner within 6 screen px at three zooms', () => {
        const { add, snapper } = buildSnapper();
        const box = add({ x: 103, y: 103 }, { kind: 'rectangle', width: 40, height: 40 });

        for (const zoom of [0.5, 1, 4]) {
            const view = viewAt(zoom);
            const nearCorner = { x: 123 + 4 / zoom, y: 123 };
            const nearCentre = { x: 103, y: 103 - 5 / zoom };

            expect(snapper.snapPoint(nearCorner, [box], view, FREE).point).toEqual({ x: 123, y: 123 });
            expect(snapper.snapPoint(nearCentre, [box], view, FREE).point).toEqual({ x: 103, y: 103 });
        }
    });

    test('the nearest wins, corners of a turned shape in level positions', () => {
        const { add, snapper } = buildSnapper();
        const turned = add({ x: 0, y: 0 }, { kind: 'rectangle', width: 10, height: 10 }, 90);
        const view = viewAt(1);

        const result = snapper.snapPoint({ x: 6, y: 4 }, [turned], view, FREE);

        expect(result.point.x).toBeCloseTo(5);
        expect(result.point.y).toBeCloseTo(5);
    });

    test("a circle's centre is a snap point", () => {
        const { add, snapper } = buildSnapper();
        const wheel = add({ x: 207, y: 207 }, { kind: 'circle', radius: 50 });

        expect(snapper.snapPoint({ x: 210, y: 210 }, [wheel], viewAt(1), FREE).point).toEqual({ x: 207, y: 207 });
    });

    test('past 6 screen px the grid snaps, and with no entities given', () => {
        const { add, snapper } = buildSnapper();
        const box = add({ x: 103, y: 103 }, { kind: 'rectangle', width: 40, height: 40 });
        const view = viewAt(1);

        expect(snapper.snapPoint({ x: 112, y: 111 }, [box], view, FREE).point).toEqual({ x: 110, y: 110 });
        expect(snapper.snapPoint({ x: 104, y: 104 }, [], view, FREE).point).toEqual({ x: 100, y: 100 });
    });

    test('Ctrl turns both off', () => {
        const { add, snapper } = buildSnapper();
        const box = add({ x: 103, y: 103 }, { kind: 'rectangle', width: 40, height: 40 });

        const result = snapper.snapPoint({ x: 104, y: 104 }, [box], viewAt(1), CTRL);

        expect(result).toEqual({ point: { x: 104, y: 104 }, snappedX: false, snappedY: false });
    });
});
