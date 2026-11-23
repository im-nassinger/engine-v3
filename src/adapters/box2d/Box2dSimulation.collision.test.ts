import { beforeAll, describe, expect, test } from 'vitest';

import {
    BodyComponent,
    ShapeComponent,
    SurfaceComponent,
    TransformComponent,
    TriggerComponent,
} from '../../core/components/index.ts';
import type { EntityId } from '../../core/fields/index.ts';
import { LevelWriter } from '../../core/level-data/index.ts';
import { Level } from '../../core/level/index.ts';
import type { Entity } from '../../core/level/index.ts';
import { runHeadless } from '../../core/simulation/index.ts';
import type { Simulation } from '../../core/simulation/index.ts';

import { Box2dPhysicsEngine } from './Box2dPhysicsEngine.ts';

const START = { clockTimeMs: 0 };

const engine = new Box2dPhysicsEngine();

beforeAll(async () => {
    await engine.load();
});

function placeBox(level: Level, parent: Entity, x: number, y: number, width: number) {
    const entity = level.createEntity(parent, parent.children.length);
    const values = { position: { x, y }, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 };
    entity.addComponent(new TransformComponent(values));
    entity.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width, height: 20 } }));
    entity.addComponent(new SurfaceComponent());

    return entity;
}

function hearsCollision(entity: Entity) {
    const trigger = {
        id: 1,
        name: null,
        on: true,
        when: { kind: 'collision' as const },
        checks: [],
        actions: [],
        repeat: { kind: 'everyTime' as const },
    };
    entity.addComponent(new TriggerComponent({ triggers: [trigger], nextTriggerId: 2 }));
}

type Heard = { readonly tick: number; readonly owner: EntityId; readonly other: EntityId | null };

function playHeard(level: Level, ticks: number) {
    const heard: Heard[] = [];
    let tick = 0;
    const afterTick = (simulation: Simulation) => {
        tick += 1;
        for (const firing of simulation.firings) {
            heard.push({ tick, owner: firing.owner.id, other: firing.other });
        }
    };

    const outcome = runHeadless(new LevelWriter().write(level), engine, { ticks, start: START, afterTick });
    if (!outcome.ok) throw new Error('The level was refused.');

    return heard;
}

describe('collision with Box2D', () => {
    test("a ball falling on a wall fires the wall's trigger once, naming the ball, and the ball's naming the wall", () => {
        const level = Level.createNew();
        const wall = placeBox(level, level.world, 0, 200, 400);
        hearsCollision(wall);
        const ball = placeBox(level, level.world, 0, 0, 20);
        ball.addComponent(new BodyComponent());
        hearsCollision(ball);

        const heard = playHeard(level, 180);

        expect(heard.map((firing) => [firing.owner, firing.other])).toEqual([
            [wall.id, ball.id],
            [ball.id, wall.id],
        ]);
        expect(heard[0]?.tick).toBe(heard[1]?.tick);
    });
});
