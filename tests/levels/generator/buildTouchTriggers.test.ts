import { beforeAll, describe, expect, test } from 'vitest';
import { Box2dPhysicsEngine } from '../../../src/adapters/box2d/index.ts';
import { SurfaceComponent, TriggerComponent, VariablesComponent } from '../../../src/core/components/index.ts';
import { LevelWriter } from '../../../src/core/level-data/index.ts';
import { runHeadless } from '../../../src/core/simulation/index.ts';
import type { Simulation } from '../../../src/core/simulation/index.ts';

import { buildTouchTriggers, TOUCHES_VARIABLE } from './buildTouchTriggers.ts';

const engine = new Box2dPhysicsEngine();
const TEN_SECONDS = 600;

beforeAll(async () => {
    await engine.load();
});

function touchesOf(simulation: Simulation) {
    const variables = simulation.level.world.requireComponent(VariablesComponent).get('variables');

    return variables.find((variable) => variable.name === TOUCHES_VARIABLE)?.value ?? 0;
}

describe('buildTouchTriggers', () => {
    test('holds the sensors with a touch trigger each and the balls asked for', () => {
        const { level, sensors, balls } = buildTouchTriggers(1_000, 100);

        // The World and the camera besides them.
        expect(level.entityCount).toBe(1_102);
        expect(sensors).toHaveLength(1_000);
        expect(balls).toHaveLength(100);
        expect(sensors.every((sensor) => sensor.getComponent(SurfaceComponent)?.get('sensor') === true)).toBe(true);
        const whens = sensors.map((sensor) => sensor.getComponent(TriggerComponent)?.get('triggers')[0]?.when?.kind);
        expect(new Set(whens)).toEqual(new Set(['touched']));
    });

    test('keeps the balls sweeping through the sensors for 10 s', () => {
        const { level } = buildTouchTriggers(1_000, 100);
        const perSecond: number[] = [];
        const outcome = runHeadless(new LevelWriter().write(level), engine, {
            ticks: TEN_SECONDS,
            start: { clockTimeMs: 0 },
            afterTick: (simulation) => {
                if (simulation.tick % 60 === 0) {
                    perSecond.push(touchesOf(simulation));
                }
            },
        });

        if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);
        const gains = perSecond.map((touches, i) => touches - (perSecond[i - 1] ?? 0));
        // Every second of the run, the last one too, counts touches: the balls never rest.
        expect(gains.every((gain) => gain > 100)).toBe(true);
    });

    test('refuses a count that is not a whole number', () => {
        expect(() => buildTouchTriggers(1.5, 1)).toThrow(
            'A level of touch triggers holds whole numbers of sensors and balls, not 1.5.',
        );
    });
});
