import { describe, expect, test } from 'vitest';

import {
    BodyComponent,
    JointComponent,
    PhysicsWorldComponent,
    ShapeComponent,
    StyleComponent,
    SurfaceComponent,
    TagsComponent,
    TransformComponent,
    TriggerComponent,
    VariablesComponent,
} from '../../components/index.ts';
import type { ComponentTypeName } from '../../components/index.ts';
import type { Action, Check, Trigger, When } from '../../fields/index.ts';
import { LevelWriter } from '../../level-data/index.ts';
import { Level } from '../../level/index.ts';
import type { Entity } from '../../level/index.ts';
import type { SensorEvent } from '../../physics/index.ts';

import type { TickInputs } from '../inputs/TickInputs.ts';
import type { Simulation } from '../run/Simulation.ts';
import { startSimulation } from '../start/startSimulation.ts';
import { ScriptedEngine } from '../testing/ScriptedPhysics.ts';
import type { ScriptedWorld } from '../testing/ScriptedPhysics.ts';
import { place, placeBody, transform } from '../testing/scriptedLevel.ts';

const START = { clockTimeMs: 0 };
const NOTHING: TickInputs = { heldKeys: [], pressedKeys: [] };
const PRESS_SPACE: TickInputs = { heldKeys: ['Space'], pressedKeys: ['Space'] };
const ON_SPACE: When = { kind: 'key', key: 'Space' as never, how: 'pressed' };
const THIS = { kind: 'this' } as const;
const OTHER = { kind: 'other' } as const;

type TriggerParts = {
    readonly when?: When;
    readonly checks?: readonly Check[];
    readonly actions?: readonly Action[];
    readonly on?: boolean;
    readonly repeat?: Trigger['repeat'];
};

function giveTriggers(entity: Entity, parts: readonly TriggerParts[]) {
    const triggers: Trigger[] = parts.map((part, i) => ({
        id: i + 1,
        name: null,
        on: part.on ?? true,
        when: part.when ?? ON_SPACE,
        checks: part.checks ?? [],
        actions: part.actions ?? [],
        repeat: part.repeat ?? { kind: 'everyTime' },
    }));

    entity.addComponent(new TriggerComponent({ triggers, nextTriggerId: triggers.length + 1 }));
}

function giveTags(entity: Entity, tags: readonly string[]) {
    entity.addComponent(new TagsComponent({ tags }));
}

function levelWithCoins(coins = 0) {
    const level = Level.createNew();
    level.world.addComponent(new VariablesComponent({ variables: [{ name: 'coins', value: coins }] }));

    return level;
}

// The World is entity 1 in a new level.
const WORLD = { kind: 'entity', entity: 1 } as const;

function addCoins(amount: number, op: 'set' | 'add' | 'subtract' = 'add'): Action {
    return { kind: 'change', target: WORLD, value: { kind: 'variable', name: 'coins' }, op, amount };
}

function start(level: Level) {
    const engine = new ScriptedEngine();
    const started = startSimulation(new LevelWriter().write(level), engine, START);
    if (!started.ok) throw new Error(`The level was refused: ${JSON.stringify(started.refusal)}`);
    engine.world.falling = false;

    return { simulation: started.value, world: engine.world };
}

function coinsIn(simulation: Simulation) {
    const variables = simulation.level.world.requireComponent(VariablesComponent).get('variables');

    return variables.find((variable) => variable.name === 'coins')?.value;
}

function inRun(simulation: Simulation, entity: Entity) {
    return simulation.level.findEntity(entity.id);
}

function tagsIn(simulation: Simulation, entity: Entity) {
    return inRun(simulation, entity)?.getComponent(TagsComponent)?.get('tags');
}

function begin(sensor: Entity, visitor: Entity): SensorEvent {
    return { kind: 'begin', sensor: sensor.id, visitor: visitor.id, visitorBody: visitor.id, visitorIsSensor: false };
}

// A sensor at the origin whose touched trigger runs the actions, and a Dynamic ball 100 px right of it.
function touchLevel(actions: readonly Action[], checks: readonly Check[] = []) {
    const level = levelWithCoins();
    const sensor = placeBody(level, level.world, transform(0, 0), 'static');
    giveTriggers(sensor, [{ when: { kind: 'touched' }, checks, actions }]);
    const ball = placeBody(level, level.world, transform(100, 0));

    return { level, sensor, ball };
}

function touch(world: ScriptedWorld, simulation: Simulation, sensor: Entity, visitor: Entity) {
    world.queueSensorEvents([begin(sensor, visitor)]);
    simulation.runTick(NOTHING);
}

describe('checks', () => {
    test('a variable compared with a number', () => {
        const level = levelWithCoins(10);
        const atLeastTen: Check = { kind: 'compare', variable: 'coins', compare: 'atLeast', value: 10 };
        const isNine: Check = { kind: 'compare', variable: 'coins', compare: 'is', value: 9 };
        giveTriggers(level.world, [
            { checks: [atLeastTen], actions: [addCoins(1)] },
            { checks: [isNine], actions: [addCoins(100)] },
        ]);
        const { simulation } = start(level);

        simulation.runTick(PRESS_SPACE);

        // The second trigger reads the value the first one left.
        expect(coinsIn(simulation)).toBe(11);
    });

    test("`other`'s tag may be on a group above it, and a failed check doesn't use up once per run", () => {
        const level = levelWithCoins();
        const sensor = placeBody(level, level.world, transform(0, 0), 'static');
        const isPlayer: Check = { kind: 'hasTag', target: OTHER, tag: 'player' };
        giveTriggers(sensor, [
            { when: { kind: 'touched' }, checks: [isPlayer], actions: [addCoins(1)], repeat: { kind: 'oncePerRun' } },
        ]);
        const crate = placeBody(level, level.world, transform(100, 0));
        const playerGroup = place(level, level.world, transform(0, 0));
        giveTags(playerGroup, ['player']);
        const player = placeBody(level, playerGroup, transform(200, 0));
        const { simulation, world } = start(level);

        touch(world, simulation, sensor, crate);
        expect(coinsIn(simulation)).toBe(0);

        touch(world, simulation, sensor, player);
        expect(coinsIn(simulation)).toBe(1);
    });
});

describe('Change value', () => {
    test('sets, adds to and subtracts from a variable', () => {
        const level = levelWithCoins(5);
        giveTriggers(level.world, [{ actions: [addCoins(3), addCoins(1, 'subtract')] }]);
        const { simulation } = start(level);

        simulation.runTick(PRESS_SPACE);
        expect(coinsIn(simulation)).toBe(7);

        simulation.runTick(NOTHING);
        expect(coinsIn(simulation)).toBe(7);
    });

    test('runs on every entity with a tag, in Entities viewer order, and a tag nobody holds is no error', () => {
        const level = levelWithCoins();
        const first = place(level, level.world, transform(0, 0));
        const second = place(level, level.world, transform(0, 0));
        for (const lamp of [first, second]) {
            giveTags(lamp, ['lamp']);
            lamp.addComponent(new StyleComponent());
        }
        const opacity = { kind: 'field', component: 'StyleComponent', field: 'opacity' } as const;
        giveTriggers(level.world, [
            {
                actions: [
                    {
                        kind: 'change',
                        target: { kind: 'tagged', tag: 'lamp' },
                        value: opacity,
                        op: 'set',
                        amount: 0.25,
                    },
                    { kind: 'change', target: { kind: 'tagged', tag: 'ghost' }, value: opacity, op: 'set', amount: 0 },
                    addCoins(1),
                ],
            },
        ]);
        const { simulation } = start(level);

        simulation.runTick(PRESS_SPACE);

        for (const lamp of [first, second]) {
            expect(inRun(simulation, lamp)?.requireComponent(StyleComponent).get('opacity')).toBe(0.25);
        }
        expect(coinsIn(simulation)).toBe(1);
    });

    test("a target that lacks the value is skipped and the others still change; an amount is the field's", () => {
        const level = levelWithCoins();
        const plain = place(level, level.world, transform(0, 0));
        giveTags(plain, ['lamp']);
        const styled = place(level, level.world, transform(0, 0));
        giveTags(styled, ['lamp']);
        styled.addComponent(new StyleComponent());
        const opacity = { kind: 'field', component: 'StyleComponent', field: 'opacity' } as const;
        giveTriggers(level.world, [
            {
                actions: [
                    { kind: 'change', target: { kind: 'tagged', tag: 'lamp' }, value: opacity, op: 'add', amount: 5 },
                ],
            },
        ]);
        const { simulation } = start(level);

        simulation.runTick(PRESS_SPACE);

        expect(inRun(simulation, plain)?.getComponent(StyleComponent)).toBeUndefined();
        // Opacity stops at 1, as its field type normalizes it.
        expect(inRun(simulation, styled)?.requireComponent(StyleComponent).get('opacity')).toBe(1);
    });

    test('adds and removes a tag, and "no entity with this tag is left" hears it in the same tick', () => {
        const level = levelWithCoins();
        const door = place(level, level.world, transform(0, 0));
        giveTags(door, ['closed']);
        const tag = { kind: 'tag' } as const;
        giveTriggers(door, [
            {
                actions: [
                    { kind: 'change', target: THIS, value: tag, op: 'subtract', amount: 'closed' },
                    { kind: 'change', target: THIS, value: tag, op: 'add', amount: 'Open Door' },
                ],
            },
        ]);
        giveTriggers(level.world, [{ when: { kind: 'tagLeft', tag: 'closed' }, actions: [addCoins(1)] }]);
        const { simulation } = start(level);

        simulation.runTick(PRESS_SPACE);
        expect(tagsIn(simulation, door)).toEqual(['open_door']);
        expect(coinsIn(simulation)).toBe(1);
        expect(simulation.firings.map((firing) => firing.when.kind)).toEqual(['key', 'tagLeft']);

        // Heard once: not again on the next tick.
        simulation.runTick(NOTHING);
        expect(coinsIn(simulation)).toBe(1);
    });

    test('switches a trigger off and on by its id, and a timer switched on counts from that tick', () => {
        const level = levelWithCoins();
        const timer: TriggerParts = { when: { kind: 'after', seconds: 1 / 60 }, actions: [addCoins(1)], on: false };
        const switchOn: Action = {
            kind: 'change',
            target: THIS,
            value: { kind: 'triggerOn', trigger: 1 },
            op: 'set',
            amount: true,
        };
        giveTriggers(level.world, [timer, { actions: [switchOn] }]);
        const { simulation } = start(level);

        simulation.runTick(NOTHING);
        simulation.runTick(NOTHING);
        expect(coinsIn(simulation)).toBe(0);

        simulation.runTick(PRESS_SPACE);
        const triggers = simulation.level.world.requireComponent(TriggerComponent).get('triggers');
        expect(triggers[0]?.on).toBe(true);
        expect(coinsIn(simulation)).toBe(0);

        simulation.runTick(NOTHING);
        expect(coinsIn(simulation)).toBe(1);
    });

    test('a level start trigger switched on during the first tick hears level start', () => {
        const level = levelWithCoins();
        const switchOn: Action = {
            kind: 'change',
            target: THIS,
            value: { kind: 'triggerOn', trigger: 2 },
            op: 'set',
            amount: true,
        };
        giveTriggers(level.world, [
            { when: { kind: 'levelStart' }, actions: [switchOn] },
            { when: { kind: 'levelStart' }, actions: [addCoins(1)], on: false },
        ]);
        const { simulation } = start(level);

        simulation.runTick(NOTHING);

        expect(coinsIn(simulation)).toBe(1);
    });
});

describe('Change value tells physics when it owns the value', () => {
    test("a body's Position is set or moved from where it is now, and the body is teleported", () => {
        const level = levelWithCoins();
        const group = place(level, level.world, transform(1000, 0));
        const ball = placeBody(level, group, transform(100, 0));
        const position = { kind: 'field', component: 'TransformComponent', field: 'position' } as const;
        giveTriggers(ball, [
            { actions: [{ kind: 'change', target: THIS, value: { ...position, axis: 'x' }, op: 'add', amount: 5 }] },
            {
                when: { kind: 'key', key: 'KeyR' as never, how: 'pressed' },
                actions: [{ kind: 'change', target: THIS, value: position, op: 'set', amount: { x: 0, y: 50 } }],
            },
        ]);
        const { simulation, world } = start(level);
        world.setNextPose(ball.id, { x: 1120, y: 30, angle: 0 });

        simulation.runTick(PRESS_SPACE);

        expect(world.changes).toEqual([{ call: 'setPose', entity: ball.id, pose: { x: 1125, y: 30, angle: 0 } }]);
        expect(inRun(simulation, ball)?.requireComponent(TransformComponent).get('position')).toEqual({
            x: 125,
            y: 30,
        });

        simulation.runTick({ heldKeys: ['KeyR'], pressedKeys: ['KeyR'] });

        expect(world.changes[1]).toEqual({ call: 'setPose', entity: ball.id, pose: { x: 1000, y: 50, angle: 0 } });
        const matrix = simulation.caches.worldMatrices.matrixOf(simulation.level.requireEntity(ball.id));
        expect(matrix.apply({ x: 0, y: 0 })).toEqual({ x: 1000, y: 50 });
    });

    test('Friction, Gravity and a Hinge motor go to the physics world; a body setting is skipped with a warning', () => {
        const level = levelWithCoins();
        const wheel = placeBody(level, level.world, transform(100, 0));
        const hinge = place(level, level.world, transform(0, 0));
        hinge.addComponent(
            new JointComponent({
                ...JointComponent.schema.defaults(),
                a: wheel.id,
                ends: { a: { x: 100, y: 0 }, b: { x: 0, y: 0 } },
            }),
        );
        const field = (component: ComponentTypeName, name: string) =>
            ({ kind: 'field', component, field: name }) as const;
        giveTriggers(level.world, [
            {
                actions: [
                    {
                        kind: 'change',
                        target: { kind: 'entity', entity: wheel.id },
                        value: field('SurfaceComponent', 'friction'),
                        op: 'set',
                        amount: 2,
                    },
                    {
                        kind: 'change',
                        target: THIS,
                        value: field('PhysicsWorldComponent', 'gravity'),
                        op: 'set',
                        amount: { x: 0, y: 0 },
                    },
                    {
                        kind: 'change',
                        target: { kind: 'entity', entity: hinge.id },
                        value: field('JointComponent', 'motorSpeed'),
                        op: 'set',
                        amount: 90,
                    },
                    {
                        kind: 'change',
                        target: { kind: 'entity', entity: wheel.id },
                        value: field('BodyComponent', 'gravityScale'),
                        op: 'set',
                        amount: 0,
                    },
                ],
            },
        ]);
        const { simulation, world } = start(level);

        simulation.runTick(PRESS_SPACE);

        const defaults = JointComponent.schema.defaults();
        const surface = inRun(simulation, wheel)?.requireComponent(SurfaceComponent);
        expect(world.changes).toEqual([
            {
                call: 'setSurfaceSettings',
                entity: wheel.id,
                settings: { friction: 2, restitution: surface?.get('restitution'), sensor: false },
            },
            { call: 'setGravity', gravity: { x: 0, y: 0 } },
            {
                call: 'setMotor',
                joint: 0,
                motor: {
                    motor: defaults.motor,
                    motorSpeed: 90,
                    motorStrength: defaults.motorStrength,
                    resistance: defaults.resistance,
                },
            },
        ]);
        expect(simulation.level.world.requireComponent(PhysicsWorldComponent).get('gravity')).toEqual({ x: 0, y: 0 });
        expect(inRun(simulation, wheel)?.requireComponent(BodyComponent).get('gravityScale')).toBe(1);
        expect(simulation.warnings).toEqual(['valueFixedInPlay']);
    });

    test('the Position of a surface with no body of its own is skipped, a plain entity moves', () => {
        const level = levelWithCoins();
        const ledge = place(level, level.world, transform(0, 0));
        ledge.addComponent(new ShapeComponent());
        ledge.addComponent(new SurfaceComponent());
        const label = place(level, level.world, transform(0, 0));
        const position = { kind: 'field', component: 'TransformComponent', field: 'position' } as const;
        giveTriggers(level.world, [
            {
                actions: [
                    {
                        kind: 'change',
                        target: { kind: 'entity', entity: ledge.id },
                        value: position,
                        op: 'set',
                        amount: { x: 9, y: 9 },
                    },
                    {
                        kind: 'change',
                        target: { kind: 'entity', entity: label.id },
                        value: position,
                        op: 'set',
                        amount: { x: 9, y: 9 },
                    },
                ],
            },
        ]);
        const { simulation, world } = start(level);

        simulation.runTick(PRESS_SPACE);

        expect(inRun(simulation, ledge)?.requireComponent(TransformComponent).get('position')).toEqual({ x: 0, y: 0 });
        expect(inRun(simulation, label)?.requireComponent(TransformComponent).get('position')).toEqual({ x: 9, y: 9 });
        expect(world.changes).toEqual([]);
    });
});

describe('Destroy', () => {
    test('removes the target and its children at the end of the tick, so the actions after it still run', () => {
        const { level, sensor, ball } = touchLevel([
            { kind: 'destroy', target: OTHER },
            { kind: 'push', target: OTHER, push: { kind: 'by', x: 0, y: -300 } },
            { kind: 'destroy', target: { kind: 'entity', entity: 1 } },
        ]);
        const child = place(level, ball, transform(0, 0));
        const { simulation, world } = start(level);

        touch(world, simulation, sensor, ball);

        expect(world.changes).toEqual([{ call: 'addVelocity', entity: ball.id, velocity: { x: 0, y: -300 } }]);
        expect(inRun(simulation, ball)).toBeUndefined();
        expect(inRun(simulation, child)).toBeUndefined();
        expect(world.destroyedEntities).toEqual([ball.id]);
        // The World is never destroyed.
        expect(simulation.level.findEntity(level.world.id)).toBe(simulation.level.world);
        expect(simulation.takeReport().removed).toEqual([ball.id]);
    });
});

describe('Push', () => {
    test('away from or towards `this`, at the strength given, whatever the mass', () => {
        const { level, sensor, ball } = touchLevel([
            { kind: 'push', target: OTHER, push: { kind: 'away', strength: 200 } },
            { kind: 'push', target: OTHER, push: { kind: 'towards', strength: 50 } },
        ]);
        const { simulation, world } = start(level);

        touch(world, simulation, sensor, ball);

        expect(world.changes).toEqual([
            { call: 'addVelocity', entity: ball.id, velocity: { x: 200, y: 0 } },
            { call: 'addVelocity', entity: ball.id, velocity: { x: -50, y: -0 } },
        ]);
    });

    test('goes to the body the entity belongs to, and an entity with no body is skipped', () => {
        const level = levelWithCoins();
        const ball = placeBody(level, level.world, transform(100, 0));
        const part = place(level, ball, transform(0, 0));
        giveTags(part, ['kick']);
        const loose = place(level, level.world, transform(0, 0));
        giveTags(loose, ['kick']);
        giveTriggers(level.world, [
            { actions: [{ kind: 'push', target: { kind: 'tagged', tag: 'kick' }, push: { kind: 'by', x: 10, y: 0 } }] },
        ]);
        const { simulation, world } = start(level);

        simulation.runTick(PRESS_SPACE);

        expect(world.changes).toEqual([{ call: 'addVelocity', entity: ball.id, velocity: { x: 10, y: 0 } }]);
    });
});

describe('Win, Lose and Restart', () => {
    test('the first one recorded wins, and the rest of the tick still runs', () => {
        const level = levelWithCoins();
        giveTriggers(level.world, [
            { actions: [{ kind: 'lose' }, addCoins(1)] },
            { actions: [{ kind: 'win' }, addCoins(1)] },
        ]);
        const { simulation } = start(level);

        simulation.runTick(NOTHING);
        expect(simulation.end).toBeNull();

        simulation.runTick(PRESS_SPACE);
        expect(simulation.end).toEqual({ kind: 'lost', tick: 2 });
        expect(coinsIn(simulation)).toBe(2);
    });

    test('Restart is recorded too', () => {
        const level = levelWithCoins();
        giveTriggers(level.world, [{ actions: [{ kind: 'restart' }, { kind: 'win' }] }]);
        const { simulation } = start(level);

        simulation.runTick(PRESS_SPACE);

        expect(simulation.end).toEqual({ kind: 'restart' });
    });
});

describe('what keeps a trigger or an action from running', () => {
    test('a trigger with an unset part or an unknown variable never runs', () => {
        const level = levelWithCoins();
        const unknown: Action = {
            kind: 'change',
            target: THIS,
            value: { kind: 'variable', name: 'lives' },
            op: 'add',
            amount: 1,
        };
        giveTriggers(level.world, [
            { actions: [addCoins(1), { kind: 'push', target: THIS, push: null }] },
            { actions: [addCoins(1), unknown] },
            { actions: [addCoins(10)] },
        ]);
        const { simulation } = start(level);

        simulation.runTick(PRESS_SPACE);

        expect(coinsIn(simulation)).toBe(10);
        expect(simulation.firings.map((firing) => firing.triggerId)).toEqual([3]);
    });

    test('an action on a missing entity is skipped and the rest of the trigger runs', () => {
        const level = levelWithCoins();
        const gone = place(level, level.world, transform(0, 0));
        giveTriggers(level.world, [
            { actions: [{ kind: 'destroy', target: { kind: 'entity', entity: gone.id } }, addCoins(1)] },
        ]);
        level.removeEntity(gone);
        const { simulation } = start(level);

        simulation.runTick(PRESS_SPACE);

        expect(coinsIn(simulation)).toBe(1);
    });
});

describe('the chain limit', () => {
    test('triggers setting off triggers stop after 32 rounds in one tick, with one warning', () => {
        const level = levelWithCoins();
        const flag = place(level, level.world, transform(0, 0));
        giveTags(flag, ['flag']);
        const tag = { kind: 'tag' } as const;
        const takeAway: Action = {
            kind: 'change',
            target: { kind: 'entity', entity: flag.id },
            value: tag,
            op: 'subtract',
            amount: 'flag',
        };
        const giveBack: Action = {
            kind: 'change',
            target: { kind: 'entity', entity: flag.id },
            value: tag,
            op: 'add',
            amount: 'flag',
        };
        giveTriggers(level.world, [
            { actions: [takeAway] },
            { when: { kind: 'tagLeft', tag: 'flag' }, actions: [addCoins(1), giveBack, takeAway] },
        ]);
        const { simulation } = start(level);

        simulation.runTick(PRESS_SPACE);
        expect(coinsIn(simulation)).toBe(31);
        expect(simulation.warnings).toEqual(['chainLimit']);

        // The dropped round is not heard on the next tick.
        simulation.runTick(NOTHING);
        expect(coinsIn(simulation)).toBe(31);
    });
});
