import { beforeAll, describe, expect, test } from 'vitest';

import {
    BodyComponent,
    PhysicsWorldComponent,
    ShapeComponent,
    SurfaceComponent,
    TransformComponent,
} from '../../core/components/index.ts';
import type { Point } from '../../core/geometry/index.ts';
import type { EntityId } from '../../core/fields/index.ts';
import { LevelWriter } from '../../core/level-data/index.ts';
import { Level } from '../../core/level/index.ts';
import type { Entity } from '../../core/level/index.ts';
import { runHeadless } from '../../core/simulation/index.ts';
import type { Simulation } from '../../core/simulation/index.ts';

import { Box2dPhysicsEngine } from './Box2dPhysicsEngine.ts';

const START = { clockTimeMs: 0 };
const ORIGIN = { x: 0, y: 0 };
const TICKS = 120;

const engine = new Box2dPhysicsEngine();

beforeAll(async () => {
    await engine.load();
});

function place(level: Level, metres: Point, pixelsPerMetre: number) {
    const entity = level.createEntity(level.world, level.world.children.length);
    const position = { x: metres.x * pixelsPerMetre, y: metres.y * pixelsPerMetre };
    entity.addComponent(new TransformComponent({ position, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 }));

    return entity;
}

function addBox(entity: Entity, widthInMetres: number, heightInMetres: number, pixelsPerMetre: number) {
    const geometry = {
        kind: 'rectangle' as const,
        width: widthInMetres * pixelsPerMetre,
        height: heightInMetres * pixelsPerMetre,
    };
    entity.addComponent(new ShapeComponent({ geometry }));
    entity.addComponent(new SurfaceComponent());
}

// The same level measured in metres, drawn at a given scale: a 1 m crate falling 3 m onto a Static floor,
// in a level 100 m by 60 m.
function fallingCrate(pixelsPerMetre: number) {
    const level = Level.createNew();
    level.world.requireComponent(PhysicsWorldComponent).set('pixelsPerMetre', pixelsPerMetre);
    const bounds = { kind: 'rectangle' as const, width: 100 * pixelsPerMetre, height: 60 * pixelsPerMetre };
    level.world.requireComponent(ShapeComponent).set('geometry', bounds);

    const crate = place(level, { x: 0, y: 0 }, pixelsPerMetre);
    addBox(crate, 1, 1, pixelsPerMetre);
    crate.addComponent(new BodyComponent());
    const floor = place(level, { x: 0, y: 3.6 }, pixelsPerMetre);
    addBox(floor, 10, 0.2, pixelsPerMetre);

    return { levelData: new LevelWriter().write(level), crateId: crate.id };
}

// The crate's height after every tick, in metres.
function crateHeights(pixelsPerMetre: number) {
    const { levelData, crateId } = fallingCrate(pixelsPerMetre);
    const heights: number[] = [];
    const recordHeight = (simulation: Simulation) => heights.push(heightOf(simulation, crateId) / pixelsPerMetre);

    const outcome = runHeadless(levelData, engine, { ticks: TICKS, start: START, afterTick: recordHeight });
    if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);

    return heights;
}

function heightOf(simulation: Simulation, entityId: EntityId) {
    const entity = simulation.level.requireEntity(entityId);

    return simulation.caches.worldMatrices.matrixOf(entity).apply(ORIGIN).y;
}

describe("Box2D at the World's Pixels per metre", () => {
    test('a body falls the same in metres at 50 and at 100 px per metre', () => {
        const atFifty = crateHeights(50);
        const atHundred = crateHeights(100);

        expect(atFifty).toHaveLength(TICKS);
        atFifty.forEach((height, tick) => expect(atHundred[tick]).toBeCloseTo(height, 9));
    });

    test('it falls as gravity says, in metres: about 4.9 m in its first second if nothing stopped it', () => {
        const heights = crateHeights(100);

        // Free fall for 0.5 s is ½ × 9.8 × 0.5² ≈ 1.2 m; Box2D's step gives slightly more.
        expect(heights[29]).toBeGreaterThan(1.2);
        expect(heights[29]).toBeLessThan(1.3);
    });

    test('it lands on the floor at the same height in metres at both scales', () => {
        const restingAtFifty = crateHeights(50).at(-1) ?? NaN;
        const restingAtHundred = crateHeights(100).at(-1) ?? NaN;

        // The floor's top is at 3.5 m and the crate is 1 m tall, so it rests with its centre near 3 m.
        expect(restingAtHundred).toBeCloseTo(3, 1);
        expect(restingAtHundred).toBeCloseTo(restingAtFifty, 9);
    });
});
