import { describe, expect, test } from 'vitest';

import { TagsComponent, TriggerComponent, VariablesComponent } from '../../components/index.ts';
import type { Action, Trigger, When } from '../../fields/index.ts';
import { LevelWriter } from '../../level-data/index.ts';
import { Level } from '../../level/index.ts';
import type { Entity } from '../../level/index.ts';

import type { TickInputs } from '../inputs/TickInputs.ts';
import { POSE_STRIDE } from '../report/TickReport.ts';
import { startSimulation } from '../start/startSimulation.ts';
import { ScriptedEngine } from '../testing/ScriptedPhysics.ts';
import { placeBody, transform } from '../testing/scriptedLevel.ts';

const START = { clockTimeMs: 0 };
const NOTHING: TickInputs = { heldKeys: [], pressedKeys: [] };
const PRESS_SPACE: TickInputs = { heldKeys: ['Space'], pressedKeys: ['Space'] };
const ON_SPACE: When = { kind: 'key', key: 'Space' as never, how: 'pressed' };
const THIS = { kind: 'this' } as const;
// The World is entity 1 in a new level.
const WORLD = { kind: 'entity', entity: 1 } as const;
const ADD_COIN: Action = {
    kind: 'change',
    target: WORLD,
    value: { kind: 'variable', name: 'coins' },
    op: 'add',
    amount: 1,
};

type TriggerParts = {
    readonly when?: When;
    readonly actions: readonly Action[];
};

function giveTriggers(entity: Entity, parts: readonly TriggerParts[]) {
    const triggers: Trigger[] = parts.map((part, i) => ({
        id: i + 1,
        name: null,
        on: true,
        when: part.when ?? ON_SPACE,
        checks: [],
        actions: part.actions,
    }));

    entity.addComponent(new TriggerComponent({ triggers, nextTriggerId: triggers.length + 1 }));
}

function levelWithCoins() {
    const level = Level.createNew();
    level.world.addComponent(new VariablesComponent({ variables: [{ name: 'coins', value: 0 }] }));

    return level;
}

function start(level: Level) {
    const engine = new ScriptedEngine();
    const started = startSimulation(new LevelWriter().write(level), engine, START);
    if (!started.ok) throw new Error(`The level was refused: ${JSON.stringify(started.refusal)}`);
    engine.world.falling = false;

    return { simulation: started.value, world: engine.world };
}

describe("the report's changes", () => {
    test('carry each changed value at its latest, once per entity and component, then start again', () => {
        const level = levelWithCoins();
        giveTriggers(level.world, [{ actions: [ADD_COIN, ADD_COIN] }]);
        const { simulation } = start(level);

        simulation.runTick(PRESS_SPACE);
        simulation.runTick(PRESS_SPACE);
        const report = simulation.takeReport();

        expect(report.changes).toEqual([
            { entity: 1, component: 'VariablesComponent', values: { variables: [{ name: 'coins', value: 4 }] } },
        ]);
        expect(simulation.takeReport().changes).toEqual([]);
    });

    test("carry tags and a trigger's on/off", () => {
        const level = levelWithCoins();
        level.world.addComponent(new TagsComponent({ tags: [] }));
        giveTriggers(level.world, [
            {
                actions: [
                    { kind: 'change', target: THIS, value: { kind: 'tag' }, op: 'add', amount: 'done' },
                    {
                        kind: 'change',
                        target: THIS,
                        value: { kind: 'triggerOn', trigger: 1 },
                        op: 'set',
                        amount: false,
                    },
                ],
            },
        ]);
        const { simulation } = start(level);

        simulation.runTick(PRESS_SPACE);
        const [tags, triggers] = simulation.takeReport().changes;

        expect(tags).toEqual({ entity: 1, component: 'TagsComponent', values: { tags: ['done'] } });
        expect(triggers?.component).toBe('TriggerComponent');
        const sentTriggers = triggers?.values.triggers as readonly Trigger[];
        expect(sentTriggers[0]?.on).toBe(false);
    });

    test('drop an entity removed in the batch', () => {
        const level = levelWithCoins();
        const ball = placeBody(level, level.world, transform(100, 0));
        giveTriggers(ball, [
            {
                actions: [
                    { kind: 'change', target: THIS, value: { kind: 'tag' }, op: 'add', amount: 'gone' },
                    { kind: 'destroy', target: THIS },
                ],
            },
        ]);
        ball.addComponent(new TagsComponent({ tags: [] }));
        const { simulation } = start(level);

        simulation.runTick(PRESS_SPACE);
        const report = simulation.takeReport();

        expect(report.removed).toEqual([ball.id]);
        expect(report.changes).toEqual([]);
    });

    test('a teleported body is sent with its new Position and drawn there without a slide', () => {
        const level = levelWithCoins();
        const ball = placeBody(level, level.world, transform(100, 0));
        const position = { kind: 'field', component: 'TransformComponent', field: 'position' } as const;
        giveTriggers(ball, [
            { actions: [{ kind: 'change', target: THIS, value: position, op: 'set', amount: { x: 0, y: 50 } }] },
        ]);
        const { simulation } = start(level);

        simulation.runTick(NOTHING);
        const before = simulation.takeReport();
        const movedBefore = before.poses.length / POSE_STRIDE;
        for (let i = 0; i < movedBefore; i += 1) {
            expect(before.poses[i * POSE_STRIDE + 4]).toBe(0);
        }

        simulation.runTick(PRESS_SPACE);
        const report = simulation.takeReport();

        expect([...report.poses]).toEqual([ball.id, 0, 50, 0, 1]);
        expect(report.changes).toEqual([
            { entity: ball.id, component: 'TransformComponent', values: { position: { x: 0, y: 50 }, rotation: 0 } },
        ]);
    });
});

describe("the report's end", () => {
    test('is null while the run goes on, then the first Win or Lose with its tick, and no tick runs after', () => {
        const level = levelWithCoins();
        giveTriggers(level.world, [{ actions: [{ kind: 'win' }, ADD_COIN] }]);
        const { simulation } = start(level);

        simulation.runTick(NOTHING);
        expect(simulation.takeReport().end).toBeNull();

        simulation.runTick(PRESS_SPACE);
        simulation.runTick(PRESS_SPACE);
        const report = simulation.takeReport();

        expect(report.end).toEqual({ kind: 'won', tick: 2 });
        expect(report.lastTick).toBe(2);
        expect(simulation.tick).toBe(2);
        const variables = simulation.level.world.requireComponent(VariablesComponent).get('variables');
        expect(variables[0]?.value).toBe(1);
    });
});

describe("the report's warnings", () => {
    test('each is sent once per run, in the batch it was first given', () => {
        const level = levelWithCoins();
        const ball = placeBody(level, level.world, transform(100, 0));
        const gravityScale = { kind: 'field', component: 'BodyComponent', field: 'gravityScale' } as const;
        giveTriggers(ball, [
            { actions: [{ kind: 'change', target: THIS, value: gravityScale, op: 'set', amount: 0 }] },
            { when: { kind: 'input', input: 'dash', how: 'pressed' }, actions: [ADD_COIN] },
        ]);
        const { simulation } = start(level);

        simulation.runTick(PRESS_SPACE);
        const first = simulation.takeReport();
        simulation.runTick(PRESS_SPACE);
        const second = simulation.takeReport();

        expect(first.warnings).toEqual([{ kind: 'valueFixedInPlay' }, { kind: 'unknownInput', input: 'dash' }]);
        expect(second.warnings).toEqual([]);
    });
});
