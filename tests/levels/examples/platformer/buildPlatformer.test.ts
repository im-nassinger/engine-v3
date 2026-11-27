import { beforeAll, describe, expect, test } from 'vitest';

import { Box2dPhysicsEngine } from '../../../../src/adapters/box2d/index.ts';
import { createV1Registry, TransformComponent, TriggerComponent } from '../../../../src/core/components/index.ts';
import { triggerProblems } from '../../../../src/core/triggers/index.ts';

import { buildPlatformer } from './buildPlatformer.ts';
import { GOAL } from './course.ts';
import { platformerLevelData, playPlatformer } from './play/playPlatformer.ts';
import type { BlobTick } from './play/playPlatformer.ts';
import { BLOB_HEIGHT, COYOTE_SECONDS, MAX_FALL_SPEED, RUN_SPEED } from './controller/platformerFeel.ts';

const engine = new Box2dPhysicsEngine();
const STANDING_Y = 400 - BLOB_HEIGHT / 2;
const COYOTE_TICKS = Math.round(COYOTE_SECONDS * 60);

beforeAll(async () => {
    await engine.load();
});

function startingAt(x: number, y: number) {
    return platformerLevelData((built) => {
        built.blob.requireComponent(TransformComponent).set('position', { x, y });
    });
}

function highestRise(ticks: readonly BlobTick[]) {
    const heights = ticks.map((tick) => STANDING_Y - tick.y);

    return Math.max(...heights);
}

function speedAt(ticks: readonly BlobTick[], index: number, axis: 'x' | 'y') {
    const before = ticks[index - 1];
    const after = ticks[index];
    if (before === undefined || after === undefined) return 0;

    return (after[axis] - before[axis]) * 60;
}

function firstLanding(ticks: readonly BlobTick[], afterTick: number) {
    const landing = ticks.find((tick) => tick.tick > afterTick && tick.variables.on_ground === true);
    if (landing === undefined) throw new Error('The blob never landed.');

    return landing.tick;
}

// Runs right off the Step's edge and presses jump `delay` ticks after the blob stops standing.
function jumpAfterLeavingEdge(delay: number) {
    const level = startingAt(-2780, 280 - BLOB_HEIGHT / 2);
    const runRight = { key: 'ArrowRight', from: 5, to: 200 };
    const probe = playPlatformer(engine, 120, [runRight], level);
    const leftEdge = probe.find((tick) => tick.tick > 5 && tick.variables.on_ground === false);
    if (leftEdge === undefined) throw new Error('The blob never left the edge.');

    const pressAt = leftEdge.tick + delay;
    const ticks = playPlatformer(engine, 200, [runRight, { key: 'Space', from: pressAt, to: pressAt + 40 }], level);

    return ticks.at(-1);
}

describe('the example platformer', () => {
    test('every trigger can run', () => {
        const { level } = buildPlatformer();
        const registry = createV1Registry();
        for (const owner of level.entitiesInPanelOrder()) {
            for (const trigger of owner.getComponent(TriggerComponent)?.get('triggers') ?? []) {
                expect(triggerProblems(trigger, { owner, level, registry })).toEqual([]);
            }
        }
    });

    test('runs at the top speed and stops dead on release', () => {
        const ticks = playPlatformer(engine, 120, [{ key: 'ArrowRight', from: 10, to: 60 }]);

        expect(speedAt(ticks, 50, 'x')).toBeCloseTo(RUN_SPEED, 0);
        expect(Math.abs(speedAt(ticks, 75, 'x'))).toBeLessThan(0.1);
        expect(ticks.at(-1)?.warnings).toBe(0);
    });

    test('a held jump goes about three times higher than a tap', () => {
        const held = playPlatformer(engine, 120, [{ key: 'Space', from: 20, to: 100 }]);
        const tapped = playPlatformer(engine, 120, [{ key: 'Space', from: 20, to: 22 }]);

        expect(highestRise(held)).toBeGreaterThan(270);
        expect(highestRise(tapped)).toBeLessThan(140);
    });

    test('a jump pressed just before landing jumps on landing', () => {
        const first = playPlatformer(engine, 160, [{ key: 'Space', from: 20, to: 60 }]);
        const landing = firstLanding(first, 30);
        const ticks = playPlatformer(engine, 160, [
            { key: 'Space', from: 20, to: 60 },
            { key: 'Space', from: landing - 5, to: landing - 3 },
        ]);
        const afterLanding = ticks[landing];

        expect(afterLanding?.y).toBeLessThan(STANDING_Y - 5);
    });

    // Four runs of the level: slow under the whole suite's load.
    test('a jump just after leaving a ledge still jumps, a late one falls', () => {
        const coyoteJump = jumpAfterLeavingEdge(COYOTE_TICKS - 1);
        const lateJump = jumpAfterLeavingEdge(COYOTE_TICKS + 2);

        expect(coyoteJump?.y).toBeLessThan(300);
        expect(lateJump?.y).toBeGreaterThan(500);
    }, 30_000);

    test('falling stops speeding up at the fall speed limit', () => {
        const level = startingAt(-1100, 30 - BLOB_HEIGHT / 2);
        const ticks = playPlatformer(engine, 120, [{ key: 'ArrowRight', from: 2, to: 30 }], level);
        const speeds = ticks.map((_, index) => speedAt(ticks, index, 'y'));

        expect(Math.max(...speeds)).toBeLessThanOrEqual(MAX_FALL_SPEED + 60);
        expect(Math.max(...speeds)).toBeGreaterThan(MAX_FALL_SPEED - 60);
    });

    test('facing left shows the left frames', () => {
        const ticks = playPlatformer(engine, 40, [{ key: 'ArrowLeft', from: 10, to: 40 }]);

        expect(ticks.at(-1)?.variables.facing).toBe(-1);
        expect(ticks.at(-1)?.variables.pose).toBeGreaterThanOrEqual(20);
    });

    test('reaching the flower wins', () => {
        const level = startingAt(GOAL.x - 300, GOAL.y - BLOB_HEIGHT / 2);
        const ticks = playPlatformer(engine, 120, [{ key: 'ArrowRight', from: 2, to: 120 }], level);

        expect(ticks.at(-1)?.end).toBe('won');
    });
});
