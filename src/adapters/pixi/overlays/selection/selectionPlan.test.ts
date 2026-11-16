import { afterEach, describe, expect, test } from 'vitest';
import {
    BodyComponent,
    JointComponent,
    ShapeComponent,
    SurfaceComponent,
    TransformComponent,
} from '../../../../core/components/index.ts';
import { DerivedCaches } from '../../../../core/derived/index.ts';
import type { ShapeGeometry } from '../../../../core/geometry/index.ts';
import { Level } from '../../../../core/level/index.ts';
import type { Entity } from '../../../../core/level/index.ts';

import { MAX_OUTLINED_ENTITIES, planSelection } from './selectionPlan.ts';
import type { SelectionSource } from './SelectionSource.ts';

const SQUARE: ShapeGeometry = { kind: 'rectangle', width: 20, height: 20 };
const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

function makeLevel() {
    const level = Level.createNew();
    const caches = new DerivedCaches(level);
    cleanups.push(() => caches.dispose());

    return { level, caches };
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
    entity.addComponent(new ShapeComponent({ geometry: SQUARE }));

    return entity;
}

function sourceOf(entities: readonly Entity[], caches: DerivedCaches): SelectionSource {
    return {
        entities,
        frame: undefined,
        selectionBox: undefined,
        readout: undefined,
        editedPoints: undefined,
        isHidden: (entity) => caches.hidden.isHidden(entity),
        isLocked: (entity) => caches.hidden.isLocked(entity),
        subscribe: () => () => {},
    };
}

function plan(entities: readonly Entity[], level: Level, caches: DerivedCaches) {
    return planSelection(sourceOf(entities, caches), level, caches);
}

describe('planSelection', () => {
    test('nothing selected draws nothing', () => {
        const { level, caches } = makeLevel();
        const result = plan([], level, caches);

        expect(result.outlines).toEqual([]);
        expect(result.sharedBox).toBeUndefined();
        expect(result.hiddenBox).toBeUndefined();
    });

    test('one shape is outlined heavier, with no shared box', () => {
        const { level, caches } = makeLevel();
        const shape = addShape(level, level.world, 0, 0);
        const result = plan([shape], level, caches);

        expect(result.outlines).toEqual([shape]);
        expect(result.heavyOutline).toBe(true);
        expect(result.sharedBox).toBeUndefined();
    });

    test('one group draws its box alone, no outlines', () => {
        const { level, caches } = makeLevel();
        const group = place(level, level.world, 0, 0);
        addShape(level, group, 0, 0);
        const result = plan([group], level, caches);

        expect(result.outlines).toEqual([]);
        expect(result.sharedBox).toBeUndefined();
    });

    test('several entities get a thin outline each and one shared box around them', () => {
        const { level, caches } = makeLevel();
        const left = addShape(level, level.world, -50, 0);
        const group = place(level, level.world, 50, 0);
        const child = addShape(level, group, 0, 0);
        const result = plan([left, group], level, caches);

        expect(new Set(result.outlines)).toEqual(new Set([left, child]));
        expect(result.heavyOutline).toBe(false);
        expect(result.sharedBox).toMatchObject({ left: -60, top: -10, right: 60, bottom: 10 });
    });

    test('a joint is a ring at its position', () => {
        const { level, caches } = makeLevel();
        const joint = place(level, level.world, 30, 40);
        joint.addComponent(new JointComponent());
        const result = plan([joint], level, caches);

        expect(result.rings).toEqual([{ x: 30, y: 40 }]);
        expect(result.outlines).toEqual([]);
    });

    test('the camera is a heavier frame of its size', () => {
        const { level, caches } = makeLevel();
        const result = plan([level.camera], level, caches);

        expect(result.cameraFrames).toHaveLength(1);
        expect(result.cameraFrames[0]?.width).toBe(1920);
        expect(result.outlines).toEqual([]);
    });

    test('a locked group is outlined plainly with a padlock', () => {
        const { level, caches } = makeLevel();
        const group = place(level, level.world, 0, 0);
        const child = addShape(level, group, 0, 0);
        group.setLocked(true);
        const result = plan([group], level, caches);

        expect(result.outlines).toEqual([child]);
        expect(result.padlocks).toHaveLength(1);
    });

    test('only hidden entities give a dashed box where they are, and nothing else', () => {
        const { level, caches } = makeLevel();
        const shape = addShape(level, level.world, 100, 0);
        const joint = place(level, level.world, 0, 0);
        joint.addComponent(new JointComponent());
        shape.setHidden(true);
        joint.setHidden(true);
        const result = plan([shape, joint], level, caches);

        expect(result.hiddenBox).toMatchObject({ left: 0, top: -10, right: 110, bottom: 10 });
        expect(result.outlines).toEqual([]);
        expect(result.rings).toEqual([]);
        expect(result.sharedBox).toBeUndefined();
    });

    test('a hidden entity beside visible ones is left out of the outlines and the box', () => {
        const { level, caches } = makeLevel();
        const shown = addShape(level, level.world, 0, 0);
        const hidden = addShape(level, level.world, 500, 0);
        hidden.setHidden(true);
        const result = plan([shown, hidden], level, caches);

        expect(result.outlines).toEqual([shown]);
        expect(result.sharedBox).toMatchObject({ left: -10, right: 10 });
        expect(result.hiddenBox).toBeUndefined();
    });

    test('selecting a shape with physics outlines the rest of its body', () => {
        const { level, caches } = makeLevel();
        const car = place(level, level.world, 0, 0);
        car.addComponent(new BodyComponent());
        const wheel = addShape(level, car, -20, 0);
        const chassis = addShape(level, car, 20, 0);
        const decoration = addShape(level, car, 0, -20);
        wheel.addComponent(new SurfaceComponent());
        chassis.addComponent(new SurfaceComponent());
        const result = plan([wheel], level, caches);

        expect(result.outlines).toEqual([wheel]);
        expect(result.bodyOutlines).toEqual([chassis]);
        expect(result.bodyOutlines).not.toContain(decoration);
    });

    test('a body that does not merge is a body of its own', () => {
        const { level, caches } = makeLevel();
        const car = place(level, level.world, 0, 0);
        car.addComponent(new BodyComponent());
        const loose = addShape(level, car, 0, 0);
        const ownBody = new BodyComponent();
        ownBody.set('merge', false);
        loose.addComponent(ownBody);
        loose.addComponent(new SurfaceComponent());
        const other = addShape(level, car, 50, 0);
        other.addComponent(new SurfaceComponent());
        const result = plan([loose], level, caches);

        expect(result.bodyOutlines).toEqual([]);
    });

    test(`above ${MAX_OUTLINED_ENTITIES} selected, only the shared box and a count`, () => {
        const { level, caches } = makeLevel();
        const shapes = Array.from({ length: MAX_OUTLINED_ENTITIES + 1 }, (_, i) => addShape(level, level.world, i, 0));
        const result = plan(shapes, level, caches);

        expect(result.count).toBe(501);
        expect(result.outlines).toEqual([]);
        expect(result.sharedBox).toBeDefined();
    });

    test(`exactly ${MAX_OUTLINED_ENTITIES} selected are still outlined`, () => {
        const { level, caches } = makeLevel();
        const shapes = Array.from({ length: MAX_OUTLINED_ENTITIES }, (_, i) => addShape(level, level.world, i, 0));
        const result = plan(shapes, level, caches);

        expect(result.count).toBeUndefined();
        expect(result.outlines).toHaveLength(MAX_OUTLINED_ENTITIES);
    });
});
