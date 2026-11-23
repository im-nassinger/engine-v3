import { beforeAll, describe, expect, test } from 'vitest';
import { Box2dPhysicsEngine } from '../../../src/adapters/box2d/index.ts';
import {
    BodyComponent,
    SurfaceComponent,
    TriggerComponent,
    VariablesComponent,
} from '../../../src/core/components/index.ts';
import { LevelWriter } from '../../../src/core/level-data/index.ts';
import { runHeadless } from '../../../src/core/simulation/index.ts';
import type { Simulation } from '../../../src/core/simulation/index.ts';

import { buildCollisionTriggers, HITS_VARIABLE } from './buildCollisionTriggers.ts';

const engine = new Box2dPhysicsEngine();
const TEN_SECONDS = 600;
// Fewer hits a second than this would mean the balls have mostly come to rest or left the posts.
const FEWEST_HITS_A_SECOND = 100;

beforeAll(async () => {
    await engine.load();
});

function hitsOf(simulation: Simulation): number {
    const variables = simulation.level.world.requireComponent(VariablesComponent).get('variables');

    const hits = variables.find((variable) => variable.name === HITS_VARIABLE)?.value;

    return typeof hits === 'number' ? hits : 0;
}

describe('buildCollisionTriggers', () => {
    test('holds the solid posts on the ground with a collision trigger each and the balls asked for', () => {
        const { level, posts, balls } = buildCollisionTriggers(1_000, 100);

        // The World and the camera besides them.
        expect(level.entityCount).toBe(1_102);
        expect(posts).toHaveLength(1_000);
        expect(balls).toHaveLength(100);
        expect(posts.every((post) => post.getComponent(SurfaceComponent)?.get('sensor') === false)).toBe(true);
        expect(posts.some((post) => post.getComponent(BodyComponent) !== undefined)).toBe(false);
        const whens = posts.map((post) => post.getComponent(TriggerComponent)?.get('triggers')[0]?.when?.kind);
        expect(new Set(whens)).toEqual(new Set(['collision']));
    });

    test('keeps the balls hitting the posts all through 10 s', () => {
        const { level } = buildCollisionTriggers(1_000, 100);
        const perSecond: number[] = [];
        const outcome = runHeadless(new LevelWriter().write(level), engine, {
            ticks: TEN_SECONDS,
            start: { clockTimeMs: 0 },
            afterTick: (simulation) => {
                if (simulation.tick % 60 === 0) {
                    perSecond.push(hitsOf(simulation));
                }
            },
        });

        if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);
        const gains = perSecond.map((hits, i) => hits - (perSecond[i - 1] ?? 0));
        expect(gains.every((gain) => gain > FEWEST_HITS_A_SECOND)).toBe(true);
    });

    test('refuses a count that is not a whole number', () => {
        expect(() => buildCollisionTriggers(1.5, 1)).toThrow(
            'A level of collision triggers holds whole numbers of posts and balls, not 1.5.',
        );
    });
});
