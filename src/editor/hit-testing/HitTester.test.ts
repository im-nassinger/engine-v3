import { describe, expect, test } from 'vitest';

import {
    JointComponent,
    PathComponent,
    ShapeComponent,
    StyleComponent,
    TransformComponent,
} from '../../core/components/index.ts';
import { DerivedCaches } from '../../core/derived/index.ts';
import { Bounds } from '../../core/geometry/index.ts';
import type { PathGeometry, Point, ShapeGeometry } from '../../core/geometry/index.ts';
import type { Entity } from '../../core/level/index.ts';
import { Level } from '../../core/level/index.ts';
import { ViewSettings } from '../view/index.ts';

import { HIT_TOLERANCE_PX, HitTester } from './HitTester.ts';
import { LinearSpatialIndex } from './spatial-index/LinearSpatialIndex.ts';
import type { SpatialIndex } from './spatial-index/SpatialIndex.ts';

const SQUARE: ShapeGeometry = { kind: 'rectangle', width: 100, height: 100 };

type Placement = {
    readonly x: number;
    readonly y: number;
    readonly rotation?: number;
    readonly scale?: Point;
};

function buildTester() {
    const level = Level.createNew();
    const caches = new DerivedCaches(level);
    const settings = new ViewSettings();
    const index = new LinearSpatialIndex(level);
    const tester = new HitTester(level, caches, index, settings);

    return { level, settings, tester };
}

// Added as the top row of its parent, so in front of what was added before.
function place(level: Level, parent: Entity, placement: Placement) {
    const entity = level.createEntity(parent, 0);
    const transform = new TransformComponent();
    transform.set('position', { x: placement.x, y: placement.y });
    transform.set('rotation', placement.rotation ?? 0);
    transform.set('scale', placement.scale ?? { x: 1, y: 1 });
    entity.addComponent(transform);

    return entity;
}

function addShape(level: Level, parent: Entity, placement: Placement, geometry: ShapeGeometry) {
    const entity = place(level, parent, placement);
    entity.addComponent(new ShapeComponent({ geometry }));

    return entity;
}

function addFilledSquare(level: Level, parent: Entity, placement: Placement) {
    const square = addShape(level, parent, placement, SQUARE);
    square.addComponent(new StyleComponent());

    return square;
}

function probeAt(level: Level, zoom = 1) {
    return { zoom, currentGroup: level.world };
}

describe('HitTester hit areas', () => {
    test('a filled shape is hit inside and on its edge, within the tolerance', () => {
        const { level, tester } = buildTester();
        const square = addFilledSquare(level, level.world, { x: 100, y: 100 });
        const probe = probeAt(level);

        expect(tester.topmostAt({ x: 100, y: 100 }, probe)).toBe(square);
        expect(tester.topmostAt({ x: 150 + HIT_TOLERANCE_PX, y: 100 }, probe)).toBe(square);
        expect(tester.topmostAt({ x: 150 + HIT_TOLERANCE_PX + 1, y: 100 }, probe)).toBeUndefined();
    });

    test('a sensor with no fill is hit only on its edge', () => {
        const { level, tester } = buildTester();
        const sensor = addShape(level, level.world, { x: 100, y: 100 }, SQUARE);
        const style = new StyleComponent();
        style.set('fill', { kind: 'none' });
        sensor.addComponent(style);
        const probe = probeAt(level);

        expect(tester.topmostAt({ x: 100, y: 100 }, probe)).toBeUndefined();
        expect(tester.topmostAt({ x: 52, y: 100 }, probe)).toBe(sensor);
        expect(tester.topmostAt({ x: 46, y: 100 }, probe)).toBe(sensor);
    });

    test('a shape with no StyleComponent is hit only on its edge', () => {
        const { level, tester } = buildTester();
        const shape = addShape(level, level.world, { x: 100, y: 100 }, SQUARE);
        const probe = probeAt(level);

        expect(tester.topmostAt({ x: 100, y: 100 }, probe)).toBeUndefined();
        expect(tester.topmostAt({ x: 100, y: 53 }, probe)).toBe(shape);
    });

    test.each([0.01, 1, 10])('a line is hit within 5 screen px at zoom %s, and not at 6', (zoom) => {
        const { level, tester } = buildTester();
        const geometry: ShapeGeometry = {
            kind: 'line',
            points: [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
            ],
        };
        const line = addShape(level, level.world, { x: 3000, y: 3000 }, geometry);
        const style = new StyleComponent();
        style.set('outlineWidth', 0);
        line.addComponent(style);
        const probe = probeAt(level, zoom);
        const fiveScreenPx = 5 / zoom;
        const sixScreenPx = 6 / zoom;

        expect(tester.topmostAt({ x: 3050, y: 3000 + fiveScreenPx }, probe)).toBe(line);
        expect(tester.topmostAt({ x: 3050, y: 3000 - sixScreenPx }, probe)).toBeUndefined();
    });

    test('an outline wider than the tolerance is hit across its whole width', () => {
        const { level, tester } = buildTester();
        const square = addShape(level, level.world, { x: 100, y: 100 }, SQUARE);
        const style = new StyleComponent();
        style.set('fill', { kind: 'none' });
        style.set('outlineWidth', 40);
        square.addComponent(style);
        const probe = probeAt(level);

        expect(tester.topmostAt({ x: 169, y: 100 }, probe)).toBe(square);
        expect(tester.topmostAt({ x: 131, y: 100 }, probe)).toBe(square);
        expect(tester.topmostAt({ x: 100, y: 100 }, probe)).toBeUndefined();
    });

    test('a rotated square is hit where it is turned to, not in its old corners', () => {
        const { level, tester } = buildTester();
        const square = addFilledSquare(level, level.world, { x: 100, y: 100, rotation: 45 });
        const probe = probeAt(level);

        expect(tester.topmostAt({ x: 100, y: 165 }, probe)).toBe(square);
        expect(tester.topmostAt({ x: 145, y: 145 }, probe)).toBeUndefined();
    });

    test('a circle stretched into an ellipse is hit inside the ellipse', () => {
        const { level, tester } = buildTester();
        const geometry: ShapeGeometry = { kind: 'circle', radius: 50 };
        const ellipse = addShape(level, level.world, { x: 100, y: 100, scale: { x: 2, y: 1 } }, geometry);
        ellipse.addComponent(new StyleComponent());
        const probe = probeAt(level);

        expect(tester.topmostAt({ x: 190, y: 100 }, probe)).toBe(ellipse);
        expect(tester.topmostAt({ x: 100, y: 160 }, probe)).toBeUndefined();
    });

    test('a closed path with a fill is hit inside, and an open path only along its line', () => {
        const { level, tester } = buildTester();
        const corners = [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
        ];
        const pathPoints = corners.map((corner) => ({
            ...corner,
            handleIn: null,
            handleOut: null,
            corner: 'sharp' as const,
        }));
        const closedPath: PathGeometry = { closed: true, points: pathPoints };
        const openPath: PathGeometry = { closed: false, points: pathPoints };
        const closed = place(level, level.world, { x: 0, y: 0 });
        closed.addComponent(new PathComponent({ path: closedPath }));
        closed.addComponent(new StyleComponent());
        const open = place(level, level.world, { x: 300, y: 0 });
        open.addComponent(new PathComponent({ path: openPath }));
        open.addComponent(new StyleComponent());
        const probe = probeAt(level);

        expect(tester.topmostAt({ x: 80, y: 20 }, probe)).toBe(closed);
        expect(tester.topmostAt({ x: 380, y: 20 }, probe)).toBeUndefined();
        expect(tester.topmostAt({ x: 400, y: 50 }, probe)).toBe(open);
    });

    test('a joint is hit by its icon, the same size on screen at any zoom, and only while icons are shown', () => {
        const { level, settings, tester } = buildTester();
        const joint = place(level, level.world, { x: 100, y: 100 });
        joint.addComponent(new JointComponent());
        const probe = probeAt(level, 2);

        expect(tester.topmostAt({ x: 103, y: 100 }, probe)).toBe(joint);
        expect(tester.topmostAt({ x: 104, y: 100 }, probe)).toBeUndefined();

        settings.set('jointIcons', false);

        expect(tester.topmostAt({ x: 100, y: 100 }, probe)).toBeUndefined();
    });

    test('the camera is hit on its frame, not inside, and only while the frame is shown', () => {
        const { level, settings, tester } = buildTester();
        const probe = probeAt(level);

        expect(tester.topmostAt({ x: 962, y: 0 }, probe)).toBe(level.camera);
        expect(tester.topmostAt({ x: 0, y: -540 }, probe)).toBe(level.camera);
        expect(tester.topmostAt({ x: 0, y: 0 }, probe)).toBeUndefined();

        settings.set('cameraFrame', false);

        expect(tester.topmostAt({ x: 962, y: 0 }, probe)).toBeUndefined();
    });

    test('the World is never hit, though its rectangle is filled', () => {
        const { level, settings, tester } = buildTester();
        settings.set('cameraFrame', false);

        expect(tester.topmostAt({ x: 0, y: 0 }, probeAt(level))).toBeUndefined();
    });
});

describe('HitTester passing through', () => {
    test('the top row wins where two overlap', () => {
        const { level, tester } = buildTester();
        addFilledSquare(level, level.world, { x: 100, y: 100 });
        const front = addFilledSquare(level, level.world, { x: 120, y: 100 });

        expect(tester.topmostAt({ x: 110, y: 100 }, probeAt(level))).toBe(front);
    });

    test('clicks pass through hidden entities and entities in a hidden group', () => {
        const { level, tester } = buildTester();
        const back = addFilledSquare(level, level.world, { x: 100, y: 100 });
        const hidden = addFilledSquare(level, level.world, { x: 100, y: 100 });
        hidden.setHidden(true);
        const group = place(level, level.world, { x: 0, y: 0 });
        addFilledSquare(level, group, { x: 100, y: 100 });
        group.setHidden(true);

        expect(tester.topmostAt({ x: 100, y: 100 }, probeAt(level))).toBe(back);
    });

    test('clicks pass through locked entities', () => {
        const { level, tester } = buildTester();
        const back = addFilledSquare(level, level.world, { x: 100, y: 100 });
        const locked = addFilledSquare(level, level.world, { x: 100, y: 100 });
        locked.setLocked(true);

        expect(tester.topmostAt({ x: 100, y: 100 }, probeAt(level))).toBe(back);
    });

    test('entities inside the camera are passed through, unless you are inside the camera', () => {
        const { level, tester } = buildTester();
        const back = addFilledSquare(level, level.world, { x: 100, y: 100 });
        const score = addFilledSquare(level, level.camera, { x: 100, y: 100 });

        expect(tester.topmostAt({ x: 100, y: 100 }, probeAt(level))).toBe(back);

        const insideTheCamera = { zoom: 1, currentGroup: level.camera };

        expect(tester.topmostAt({ x: 100, y: 100 }, insideTheCamera)).toBe(score);
    });

    test('allAt lists everything under the point, front to back', () => {
        const { level, tester } = buildTester();
        const back = addFilledSquare(level, level.world, { x: 100, y: 100 });
        const front = addFilledSquare(level, level.world, { x: 100, y: 100 });

        expect(tester.allAt({ x: 100, y: 100 }, probeAt(level))).toEqual([front, back]);
    });
});

describe('HitTester selection box', () => {
    test('touching a shape is enough', () => {
        const { level, tester } = buildTester();
        const square = addFilledSquare(level, level.world, { x: 100, y: 100 });
        const box = new Bounds(140, 140, 300, 300);

        expect(tester.allTouching(box, probeAt(level))).toEqual([square]);
    });

    test('a box wholly inside a filled shape touches it, and inside an unfilled one does not', () => {
        const { level, tester } = buildTester();
        const filled = addFilledSquare(level, level.world, { x: 100, y: 100 });
        addShape(level, level.world, { x: 300, y: 100 }, SQUARE);
        const probe = probeAt(level);

        expect(tester.allTouching(new Bounds(90, 90, 110, 110), probe)).toEqual([filled]);
        expect(tester.allTouching(new Bounds(290, 90, 310, 110), probe)).toEqual([]);
    });

    test('a box beside a shape, inside its bounds but off its outline, misses it', () => {
        const { level, tester } = buildTester();
        addFilledSquare(level, level.world, { x: 100, y: 100, rotation: 45 });

        expect(tester.allTouching(new Bounds(150, 150, 165, 165), probeAt(level))).toEqual([]);
    });

    test('a box lists the children of a group, never the group, and the joint icons it touches', () => {
        const { level, tester } = buildTester();
        const group = place(level, level.world, { x: 0, y: 0 });
        const child = addFilledSquare(level, group, { x: 100, y: 100 });
        const joint = place(level, level.world, { x: 300, y: 100 });
        joint.addComponent(new JointComponent());
        const box = new Bounds(140, 90, 294, 110);

        const touched = tester.allTouching(box, probeAt(level));

        expect(touched).toHaveLength(2);
        expect(touched).toContain(child);
        expect(touched).toContain(joint);
    });
});

describe('HitTester selectableFor', () => {
    test('a hit inside a group selects the group', () => {
        const { level, tester } = buildTester();
        const group = place(level, level.world, { x: 0, y: 0 });
        const child = addFilledSquare(level, group, { x: 100, y: 100 });
        const hit = tester.topmostAt({ x: 100, y: 100 }, probeAt(level));

        expect(hit).toBe(child);
        expect(tester.selectableFor(child, level.world, false)).toBe(group);
    });

    test('inside groups, as with Ctrl, the hit itself is selected', () => {
        const { level, tester } = buildTester();
        const group = place(level, level.world, { x: 0, y: 0 });
        const child = addFilledSquare(level, group, { x: 100, y: 100 });

        expect(tester.selectableFor(child, level.world, true)).toBe(child);
    });

    test('from inside a group, its direct child is selected, and a hit outside it selects nothing', () => {
        const { level, tester } = buildTester();
        const outer = place(level, level.world, { x: 0, y: 0 });
        const inner = place(level, outer, { x: 0, y: 0 });
        const deep = addFilledSquare(level, inner, { x: 100, y: 100 });
        const outside = addFilledSquare(level, level.world, { x: 300, y: 100 });

        expect(tester.selectableFor(deep, outer, false)).toBe(inner);
        expect(tester.selectableFor(outside, outer, false)).toBeUndefined();
        expect(tester.selectableFor(outside, outer, true)).toBeUndefined();
        expect(tester.selectableFor(outer, outer, false)).toBeUndefined();
    });
});

describe('LinearSpatialIndex', () => {
    test('returns every entity, back to front, whatever the area', () => {
        const { level } = buildTester();
        const back = level.createEntity(level.world, 0);
        const front = level.createEntity(level.world, 0);
        const index: SpatialIndex = new LinearSpatialIndex(level);

        const found = [...index.query(new Bounds(0, 0, 1, 1))];

        expect(found).toEqual([level.world, level.camera, back, front]);
    });
});
