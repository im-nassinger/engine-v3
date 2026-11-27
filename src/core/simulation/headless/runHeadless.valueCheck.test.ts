import { describe, expect, test } from 'vitest';

import { SurfaceComponent, TagsComponent, TransformComponent, TriggerComponent } from '../../components/index.ts';
import type { Check, Compare, ReadableValue, Target, Trigger } from '../../fields/index.ts';
import { LevelWriter } from '../../level-data/index.ts';
import { Level } from '../../level/index.ts';
import type { Entity } from '../../level/index.ts';

import { runHeadless } from './runHeadless.ts';
import type { Simulation } from '../run/Simulation.ts';
import { ScriptedEngine } from '../testing/ScriptedPhysics.ts';
import { place, placeBody, transform } from '../testing/scriptedLevel.ts';

const START = { clockTimeMs: 0 };
const NOTHING = { heldKeys: [], pressedKeys: [] };
const THIS: Target = { kind: 'this' };
const SPEED: ReadableValue = { kind: 'live', live: 'speed' };
const VELOCITY_X: ReadableValue = { kind: 'live', live: 'velocityX' };
const VELOCITY_Y: ReadableValue = { kind: 'live', live: 'velocityY' };
const POSITION_Y: ReadableValue = { kind: 'field', component: 'TransformComponent', field: 'position', axis: 'y' };
const FRICTION: ReadableValue = { kind: 'field', component: 'SurfaceComponent', field: 'friction' };

function valueIs(target: Target, value: ReadableValue, compare: Compare, amount: number | null): Check {
    return { kind: 'value', target, value, compare, amount };
}

// A trigger heard every tick (every 1/60 s) with these checks.
function checksEveryTick(entity: Entity, checks: readonly Check[]) {
    const trigger: Trigger = {
        id: 1,
        name: null,
        on: true,
        when: { kind: 'every', time: 1 / 60, unit: 'seconds' },
        checks,
        actions: [],
    };

    entity.addComponent(new TriggerComponent({ triggers: [trigger], nextTriggerId: 2 }));
}

type PlayOptions = {
    readonly ticks: number;
    // How far `falling` moves down in each tick's step, in px: n px in tick n by default, so its speed
    // grows by 60 px/s a tick, as gravity would make it.
    readonly falling?: Entity;
};

// Plays the level headless on a ScriptedWorld where only `falling` moves, and gives the ticks on which each
// entity's trigger passed its checks.
function play(level: Level, options: PlayOptions) {
    const engine = new ScriptedEngine();
    engine.world.falling = false;
    const passed: Record<number, number[]> = {};
    let currentTick = 0;
    let fallenY = options.falling?.requireComponent(TransformComponent).get('position').y ?? 0;

    const inputsAt = (tick: number) => {
        currentTick = tick;
        if (options.falling !== undefined) {
            fallenY += tick;
            engine.world.setNextPose(options.falling.id, { x: 0, y: fallenY, angle: 0 });
        }

        return NOTHING;
    };
    const afterTick = (simulation: Simulation) => {
        for (const firing of simulation.firings) {
            (passed[firing.owner.id] ??= []).push(currentTick);
        }
    };

    const levelData = new LevelWriter().write(level);
    const outcome = runHeadless(levelData, engine, { ticks: options.ticks, start: START, inputsAt, afterTick });
    if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);

    return passed;
}

const EVERY_TICK_TO_8 = [1, 2, 3, 4, 5, 6, 7, 8];

function fallingBall() {
    const level = Level.createNew();
    const ball = placeBody(level, level.world, transform(0, 0));

    return { level, ball };
}

describe('The component value check reads live values', () => {
    test('"If this BodyComponent speed is more than 200" passes once the falling ball is fast enough', () => {
        const { level, ball } = fallingBall();
        checksEveryTick(ball, [valueIs(THIS, SPEED, 'more', 200)]);

        // In tick n the ball moves n px, 60n px/s: 240 px/s in tick 4 is the first above 200.
        expect(play(level, { ticks: 8, falling: ball })).toEqual({ [ball.id]: [4, 5, 6, 7, 8] });
    });

    test('the velocity is read by its axis, x and y', () => {
        const { level, ball } = fallingBall();
        const still = placeBody(level, level.world, transform(100, 0));
        checksEveryTick(ball, [valueIs(THIS, VELOCITY_Y, 'atLeast', 180), valueIs(THIS, VELOCITY_X, 'is', 0)]);
        checksEveryTick(still, [valueIs(THIS, SPEED, 'is', 0)]);

        expect(play(level, { ticks: 8, falling: ball })).toEqual({
            [ball.id]: [3, 4, 5, 6, 7, 8],
            [still.id]: EVERY_TICK_TO_8,
        });
    });

    test("a body's position is where physics has it now, not where the run started", () => {
        const { level, ball } = fallingBall();
        checksEveryTick(ball, [valueIs(THIS, POSITION_Y, 'more', 10)]);

        // After tick n the ball is at y = n(n+1)/2: 10 after tick 4, 15 after tick 5.
        expect(play(level, { ticks: 8, falling: ball })).toEqual({ [ball.id]: [5, 6, 7, 8] });
    });
});

describe('The component value check reads component values', () => {
    test("a number value of the target's components is compared with the amount", () => {
        const level = Level.createNew();
        const slippery = place(level, level.world, transform(0, 0));
        const surface = new SurfaceComponent();
        surface.set('friction', 0.1);
        slippery.addComponent(surface);
        checksEveryTick(slippery, [valueIs(THIS, FRICTION, 'less', 0.2)]);
        const rough = place(level, level.world, transform(50, 0));
        rough.addComponent(new SurfaceComponent());
        checksEveryTick(rough, [valueIs(THIS, FRICTION, 'less', 0.2)]);

        expect(play(level, { ticks: 8 })).toEqual({ [slippery.id]: EVERY_TICK_TO_8 });
    });

    test('a target without the value makes the check false, whatever the compare', () => {
        const level = Level.createNew();
        const plain = place(level, level.world, transform(0, 0));
        checksEveryTick(plain, [valueIs(THIS, FRICTION, 'isNot', 5)]);
        const noBody = place(level, level.world, transform(50, 0));
        checksEveryTick(noBody, [valueIs(THIS, SPEED, 'atLeast', 0)]);
        const wholeVector = place(level, level.world, transform(80, 0));
        const position: ReadableValue = { kind: 'field', component: 'TransformComponent', field: 'position' };
        checksEveryTick(wholeVector, [valueIs(THIS, position, 'isNot', 5)]);

        expect(play(level, { ticks: 4 })).toEqual({});
    });

    test('a check with no amount yet is false', () => {
        const { level, ball } = fallingBall();
        checksEveryTick(ball, [valueIs(THIS, SPEED, 'atLeast', null)]);

        expect(play(level, { ticks: 4, falling: ball })).toEqual({});
    });
});

describe('The component value check on a tag', () => {
    test('passes when any tagged entity passes', () => {
        const { level, ball } = fallingBall();
        ball.addComponent(new TagsComponent({ tags: ['ball'] }));
        const resting = placeBody(level, level.world, transform(100, 0));
        resting.addComponent(new TagsComponent({ tags: ['ball'] }));
        const balls: Target = { kind: 'tagged', tag: 'ball' };
        checksEveryTick(level.world, [valueIs(balls, SPEED, 'more', 200)]);

        expect(play(level, { ticks: 6, falling: ball })).toEqual({ [level.world.id]: [4, 5, 6] });
    });

    test('is false when no tagged entity has the value, or nobody holds the tag', () => {
        const level = Level.createNew();
        const plain = place(level, level.world, transform(0, 0));
        plain.addComponent(new TagsComponent({ tags: ['ball'] }));
        checksEveryTick(level.world, [valueIs({ kind: 'tagged', tag: 'ball' }, SPEED, 'atLeast', 0)]);
        const other = place(level, level.world, transform(50, 0));
        checksEveryTick(other, [valueIs({ kind: 'tagged', tag: 'nobody' }, SPEED, 'atLeast', 0)]);

        expect(play(level, { ticks: 4 })).toEqual({});
    });
});
