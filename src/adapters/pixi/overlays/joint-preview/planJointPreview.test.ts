import { afterEach, describe, expect, test } from 'vitest';
import { JointComponent, ShapeComponent, TransformComponent } from '../../../../core/components/index.ts';
import { DerivedCaches } from '../../../../core/derived/index.ts';
import { Level } from '../../../../core/level/index.ts';
import type { Entity } from '../../../../core/level/index.ts';

import type { ShownJointPreview } from './JointPreviewSource.ts';
import { planJointPreview } from './planJointPreview.ts';

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

function place(level: Level, x: number, y: number) {
    const entity = level.createEntity(level.world, 0);
    entity.addComponent(new TransformComponent({ ...TransformComponent.schema.defaults(), position: { x, y } }));

    return entity;
}

// A 20 px square centred on (x, y).
function addSquare(level: Level, x: number, y: number) {
    const square = place(level, x, y);
    square.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 20, height: 20 } }));

    return square;
}

function addJoint(level: Level, x: number, y: number, a: Entity, b: Entity | null) {
    const joint = place(level, x, y);
    const component = new JointComponent();
    component.set('a', a.id);
    component.set('b', b?.id ?? null);
    joint.addComponent(component);

    return joint;
}

function previewOf(overrides: Partial<ShownJointPreview>): ShownJointPreview {
    return {
        type: 'hinge',
        ends: [],
        mouse: { x: 0, y: 0 },
        a: undefined,
        b: undefined,
        label: undefined,
        ...overrides,
    };
}

describe('planJointPreview', () => {
    test('nothing shown plans nothing', () => {
        const { level, caches } = makeLevel();

        const plan = planJointPreview({ preview: undefined, linkedJoints: [] }, level, caches);

        expect(plan).toEqual({ path: undefined, ends: [], outlined: [], label: undefined, links: [] });
    });

    test('a Hinge outlines both entities, dots the mouse and labels it, with no path', () => {
        const { level, caches } = makeLevel();
        const car = addSquare(level, 0, 0);
        const wheel = addSquare(level, 5, 5);
        const preview = previewOf({ mouse: { x: 5, y: 5 }, a: wheel, b: car, label: 'Hinge: Wheel to Car' });

        const plan = planJointPreview({ preview, linkedJoints: [] }, level, caches);

        expect(plan.path).toBeUndefined();
        expect(plan.ends).toEqual([{ x: 5, y: 5 }]);
        expect(plan.outlined.map((bounds) => bounds.centre)).toEqual([
            { x: 5, y: 5 },
            { x: 0, y: 0 },
        ]);
        expect(plan.label).toEqual({ text: 'Hinge: Wheel to Car', at: { x: 5, y: 5 } });
    });

    test('a pin to the background outlines only A', () => {
        const { level, caches } = makeLevel();
        const lamp = addSquare(level, 0, 0);
        const preview = previewOf({ a: lamp, b: null });

        const plan = planJointPreview({ preview, linkedJoints: [] }, level, caches);

        expect(plan.outlined).toHaveLength(1);
    });

    test('a Rope draws a straight line from its first end to the mouse', () => {
        const { level, caches } = makeLevel();
        const preview = previewOf({ type: 'rope', ends: [{ x: 0, y: 0 }], mouse: { x: 100, y: 0 } });

        const plan = planJointPreview({ preview, linkedJoints: [] }, level, caches);

        expect(plan.path).toEqual([
            { x: 0, y: 0 },
            { x: 100, y: 0 },
        ]);
        expect(plan.ends).toEqual([
            { x: 0, y: 0 },
            { x: 100, y: 0 },
        ]);
    });

    test('a Spring draws a zigzag, and before its first click no path', () => {
        const { level, caches } = makeLevel();
        const zigzag = previewOf({ type: 'spring', ends: [{ x: 0, y: 0 }], mouse: { x: 100, y: 0 } });
        const waiting = previewOf({ type: 'spring', mouse: { x: 100, y: 0 } });

        const zigzagPlan = planJointPreview({ preview: zigzag, linkedJoints: [] }, level, caches);
        const waitingPlan = planJointPreview({ preview: waiting, linkedJoints: [] }, level, caches);

        expect(zigzagPlan.path?.length).toBeGreaterThan(2);
        expect(waitingPlan.path).toBeUndefined();
    });

    test('a linked joint has a line from its position to the centre of each entity', () => {
        const { level, caches } = makeLevel();
        const car = addSquare(level, 0, 0);
        const wheel = addSquare(level, 50, 0);
        const joint = addJoint(level, 25, 10, wheel, car);

        const plan = planJointPreview({ preview: undefined, linkedJoints: [joint] }, level, caches);

        expect(plan.links).toEqual([
            [
                { x: 25, y: 10 },
                { x: 50, y: 0 },
            ],
            [
                { x: 25, y: 10 },
                { x: 0, y: 0 },
            ],
        ]);
    });

    test('a pinned joint has one line, and an entity with no drawing is reached at its position', () => {
        const { level, caches } = makeLevel();
        const empty = place(level, 30, 40);
        const joint = addJoint(level, 0, 0, empty, null);

        const plan = planJointPreview({ preview: undefined, linkedJoints: [joint] }, level, caches);

        expect(plan.links).toEqual([
            [
                { x: 0, y: 0 },
                { x: 30, y: 40 },
            ],
        ]);
    });
});
