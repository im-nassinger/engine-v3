import { describe, expect, test } from 'vitest';

import {
    JointComponent,
    PathComponent,
    PhysicsWorldComponent,
    ShapeComponent,
    StyleComponent,
    TriggerComponent,
    VariablesComponent,
} from '../../../core/components/index.ts';
import type { JointValues } from '../../../core/components/index.ts';
import type { EntityId } from '../../../core/fields/index.ts';
import { Matrix2D } from '../../../core/geometry/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { jointPathPoints } from '../../../core/physics/index.ts';
import type { TickReport } from '../../../core/simulation/index.ts';
import { ScriptedEngine } from '../../../core/simulation/testing/ScriptedPhysics.ts';
import { place, placeBody, transform } from '../../../core/simulation/testing/scriptedLevel.ts';

import { DirectGameRunner } from '../testing/DirectGameRunner.ts';

import { PlayMirror } from './PlayMirror.ts';

const NOTHING_HELD = { heldKeys: [], pressedKeys: [] };
const START = { clockTimeMs: 0 };
const ORIGIN = { x: 0, y: 0 };

// The level written once, started in a DirectGameRunner on a ScriptedWorld and read into a mirror.
async function startBoth(level: Level) {
    const levelData = new LevelWriter().write(level);
    const engine = new ScriptedEngine();
    const runner = new DirectGameRunner(engine);
    const started = await runner.start(levelData, START);
    expect(started).toEqual({ kind: 'started' });

    const mirrored = PlayMirror.start(levelData);
    if (!mirrored.ok) throw new Error('The mirror refused the level.');

    return { runner, world: engine.world, mirror: mirrored.value };
}

async function runBatch(runner: DirectGameRunner, mirror: PlayMirror, ticks = 1) {
    const answer = await runner.runTicks(Array.from({ length: ticks }, () => NOTHING_HELD));
    if (answer.kind !== 'ticked') throw new Error('The batch was not answered.');

    mirror.apply(answer.report);

    return answer.report;
}

// Every entity's level matrix in the play copy, and its path for a Rope or Spring, equals the mirror's.
function expectSameAsPlayCopy(runner: DirectGameRunner, mirror: PlayMirror) {
    const simulation = runner.simulation;
    if (simulation === undefined) throw new Error('No run is going.');

    const playIds = [...simulation.level.entitiesInPanelOrder()].map((entity) => entity.id);
    const mirrorIds = [...mirror.level.entitiesInPanelOrder()].map((entity) => entity.id);
    expect(mirrorIds).toEqual(playIds);

    for (const playEntity of simulation.level.entitiesInPanelOrder()) {
        const mirrorEntity = mirror.level.requireEntity(playEntity.id);
        const playMatrix = simulation.caches.worldMatrices.matrixOf(playEntity);
        expect(mirror.caches.worldMatrices.matrixOf(mirrorEntity)).toEqual(playMatrix);

        const playPath = playEntity.getComponent(PathComponent)?.get('path');
        expect(mirrorEntity.getComponent(PathComponent)?.get('path')).toEqual(playPath);
    }
}

function levelPositionOf(mirror: PlayMirror, id: EntityId, point: Point = ORIGIN) {
    return mirror.caches.worldMatrices.matrixOf(mirror.level.requireEntity(id)).apply(point);
}

function rotationOf(mirror: PlayMirror, id: EntityId) {
    return mirror.caches.worldMatrices.matrixOf(mirror.level.requireEntity(id)).decompose().rotation;
}

// A joint at the level's origin, so its ends are in level positions too.
function placeJoint(level: Level, values: Partial<JointValues>) {
    const joint = place(level, level.world, transform(0, 0));
    joint.addComponent(new JointComponent({ ...JointComponent.schema.defaults(), ...values }));
    if (values.type === 'rope' || values.type === 'spring') {
        const ends = values.ends ?? { a: ORIGIN, b: ORIGIN };
        joint.addComponent(new PathComponent({ path: jointPathPoints(values.type, ends.a, ends.b) }));
    }

    return joint;
}

// A report by hand, for what a ScriptedWorld can't send: a snap, or a body's pose in one step.
function reportOf(lastTick: number, poses: readonly (readonly number[])[], camera: Point = ORIGIN): TickReport {
    return {
        lastTick,
        poses: new Float64Array(poses.flat()),
        removed: [],
        removedPastHardLimit: [],
        paths: [],
        camera,

        changes: [],
        end: null,
        warnings: [],
    };
}

function startMirror(level: Level) {
    const mirrored = PlayMirror.start(new LevelWriter().write(level));
    if (!mirrored.ok) throw new Error('The mirror refused the level.');

    return mirrored.value;
}

function closeTo(point: Point) {
    return { x: expect.closeTo(point.x, 9) as number, y: expect.closeTo(point.y, 9) as number };
}

describe('PlayMirror', () => {
    test("after each report its level matrices and paths equal the play copy's", async () => {
        const level = Level.createNew();
        const anchor = placeBody(level, level.world, transform(0, 0), 'static');
        const crate = placeBody(level, level.world, transform(0, 100, 30, 2));
        place(level, crate, transform(5, -5, 10));
        const ends = { a: { x: 0, y: 100 }, b: { x: 0, y: 0 } };
        placeJoint(level, { type: 'rope', a: crate.id, b: anchor.id, ends });
        const { runner, world, mirror } = await startBoth(level);

        expectSameAsPlayCopy(runner, mirror);
        await runBatch(runner, mirror, 4);
        expectSameAsPlayCopy(runner, mirror);

        world.setNextPose(crate.id, { x: 40, y: 150, angle: 75 });
        const report = await runBatch(runner, mirror, 1);
        expect(report.paths).toHaveLength(1);
        expectSameAsPlayCopy(runner, mirror);
        expect(mirror.tick).toBe(5);
    });

    test('at interpolation 0.5 a body, its children and the camera are halfway', async () => {
        const level = Level.createNew();
        const crate = placeBody(level, level.world, transform(0, 0));
        const label = place(level, crate, transform(0, -5));
        const { runner, mirror } = await startBoth(level);

        await runBatch(runner, mirror);
        mirror.drawAt(0.5);
        expect(levelPositionOf(mirror, crate.id)).toEqual({ x: 0, y: 5 });
        expect(levelPositionOf(mirror, label.id)).toEqual({ x: 0, y: 0 });

        await runBatch(runner, mirror);
        mirror.drawAt(0.5);
        expect(levelPositionOf(mirror, crate.id)).toEqual({ x: 0, y: 15 });
        mirror.drawAt(1);
        expect(levelPositionOf(mirror, crate.id)).toEqual({ x: 0, y: 20 });
    });

    test('the camera is drawn between its last two positions', () => {
        const mirror = startMirror(Level.createNew());

        mirror.apply(reportOf(1, [], { x: 100, y: 0 }));
        mirror.apply(reportOf(2, [], { x: 200, y: 50 }));
        mirror.drawAt(0.25);

        expect(mirror.camera).toEqual({ x: 125, y: 12.5 });
    });

    test('a snapped body is drawn at its new pose, never part of the way', () => {
        const level = Level.createNew();
        const crate = placeBody(level, level.world, transform(0, 0));
        const mirror = startMirror(level);

        mirror.apply(reportOf(1, [[crate.id, 500, 300, 90, 1]]));

        for (const interpolation of [0, 0.5, 1]) {
            mirror.drawAt(interpolation);
            expect(levelPositionOf(mirror, crate.id)).toEqual(closeTo({ x: 500, y: 300 }));
            expect(rotationOf(mirror, crate.id)).toBeCloseTo(90, 9);
        }
    });

    test('a body that stops moving stays where the last report put it', () => {
        const level = Level.createNew();
        const crate = placeBody(level, level.world, transform(0, 0));
        const mirror = startMirror(level);

        mirror.apply(reportOf(1, [[crate.id, 0, 10, 0, 0]]));
        mirror.drawAt(0.5);
        mirror.apply(reportOf(2, []));
        mirror.drawAt(0.5);

        expect(levelPositionOf(mirror, crate.id)).toEqual({ x: 0, y: 10 });
    });

    test('angles go the shorter way round', () => {
        const level = Level.createNew();
        const crate = placeBody(level, level.world, transform(0, 0));
        const wheel = placeBody(level, level.world, transform(100, 0));
        const mirror = startMirror(level);

        mirror.apply(
            reportOf(1, [
                [crate.id, 0, 0, 170, 0],
                [wheel.id, 100, 0, 10, 0],
            ]),
        );
        mirror.apply(
            reportOf(2, [
                [crate.id, 0, 0, -170, 0],
                [wheel.id, 100, 0, 350, 0],
            ]),
        );
        mirror.drawAt(0.5);

        // 170 to -170 is 20 degrees through 180, not 340 through 0; 10 to 350 is 20 through 0.
        expect(Math.abs(rotationOf(mirror, crate.id))).toBeCloseTo(180, 9);
        expect(rotationOf(mirror, wheel.id)).toBeCloseTo(0, 9);
        const halfTurn = Matrix2D.fromTransform({ ...transform(0, 0), rotation: 180 });
        expect(mirror.caches.worldMatrices.matrixOf(mirror.level.requireEntity(crate.id)).a).toBeCloseTo(halfTurn.a, 9);
    });

    test('a removed body leaves the mirror with its children and its joints', async () => {
        const level = Level.createNew();
        // 1,000 px square, so a 20 px square at y 490 is fully below its open bottom edge on the third tick.
        level.world.requireComponent(ShapeComponent).set('geometry', { kind: 'rectangle', width: 1000, height: 1000 });
        level.world.requireComponent(PhysicsWorldComponent).set('walls', false);
        const anchor = placeBody(level, level.world, transform(0, 400), 'static');
        const crate = placeBody(level, level.world, transform(0, 490));
        const label = place(level, crate, transform(0, -5));
        const ends = { a: { x: 0, y: 490 }, b: { x: 0, y: 400 } };
        const rope = placeJoint(level, { type: 'rope', a: crate.id, b: anchor.id, ends });
        const { runner, mirror } = await startBoth(level);

        const report = await runBatch(runner, mirror, 3);

        expect(report.removed).toEqual([crate.id, rope.id]);
        for (const gone of [crate, label, rope] as readonly Entity[]) {
            expect(mirror.level.findEntity(gone.id)).toBeUndefined();
        }
        expectSameAsPlayCopy(runner, mirror);
        mirror.drawAt(0.5);
        expect(mirror.level.findEntity(anchor.id)).toBeDefined();
    });

    test('a Rope is drawn on its ends between ticks', async () => {
        const level = Level.createNew();
        const anchor = placeBody(level, level.world, transform(0, 0), 'static');
        const weight = placeBody(level, level.world, transform(0, 100));
        const ends = { a: { x: 0, y: 100 }, b: { x: 0, y: 0 } };
        const rope = placeJoint(level, { type: 'rope', a: weight.id, b: anchor.id, ends });
        const { runner, mirror } = await startBoth(level);

        await runBatch(runner, mirror);
        mirror.drawAt(0.5);

        // The weight is drawn at y 105; the joint moves with it, so the anchor's end is 105 above its origin.
        const path = mirror.level.requireEntity(rope.id).requireComponent(PathComponent).get('path');
        const levelPoints = path.points.map((point) => levelPositionOf(mirror, rope.id, point));
        expect(levelPoints).toEqual([closeTo({ x: 0, y: 105 }), closeTo({ x: 0, y: 0 })]);
    });

    test("writes a report's changed values, so they show", async () => {
        const level = Level.createNew();
        level.world.addComponent(new VariablesComponent({ variables: [{ name: 'coins', value: 0 }] }));
        const crate = placeBody(level, level.world, transform(0, 0));
        crate.addComponent(new StyleComponent(StyleComponent.schema.defaults()));
        const opacity = { kind: 'field', component: 'StyleComponent', field: 'opacity' } as const;
        const coins = { kind: 'variable', name: 'coins' } as const;
        const triggers = [
            {
                id: 1,
                name: null,
                on: true,
                when: { kind: 'levelStart' },
                checks: [],
                actions: [
                    {
                        kind: 'change',
                        target: { kind: 'entity', entity: crate.id },
                        value: opacity,
                        op: 'set',
                        amount: 0.4,
                    },
                    { kind: 'change', target: { kind: 'this' }, value: coins, op: 'add', amount: 3 },
                ],
            },
        ] as const;
        level.world.addComponent(new TriggerComponent({ triggers: [...triggers], nextTriggerId: 2 }));
        const { runner, mirror } = await startBoth(level);

        const report = await runBatch(runner, mirror);

        expect(report.changes).toHaveLength(2);
        const mirrorCrate = mirror.level.requireEntity(crate.id);
        expect(mirrorCrate.requireComponent(StyleComponent).get('opacity')).toBe(0.4);
        const variables = mirror.level.world.requireComponent(VariablesComponent).get('variables');
        expect(variables).toEqual([{ name: 'coins', value: 3 }]);
    });

    test("writes an entity's changed own variables of every type", async () => {
        const level = Level.createNew();
        const door = place(level, level.world, transform(0, 0));
        door.addComponent(
            new VariablesComponent({
                variables: [
                    { name: 'open', value: false },
                    { name: 'label', value: 'shut' },
                    { name: 'hits', value: 0 },
                ],
            }),
        );
        const own = (name: string) => ({ kind: 'variable', name, own: true }) as const;
        const triggers = [
            {
                id: 1,
                name: null,
                on: true,
                when: { kind: 'levelStart' },
                checks: [],
                actions: [
                    { kind: 'change', target: { kind: 'this' }, value: own('open'), op: 'flip', amount: null },
                    { kind: 'change', target: { kind: 'this' }, value: own('label'), op: 'set', amount: 'open' },
                    { kind: 'change', target: { kind: 'this' }, value: own('hits'), op: 'add', amount: 2 },
                ],
            },
        ] as const;
        door.addComponent(new TriggerComponent({ triggers: [...triggers], nextTriggerId: 2 }));
        const { runner, mirror } = await startBoth(level);

        await runBatch(runner, mirror);

        const variables = mirror.level.requireEntity(door.id).requireComponent(VariablesComponent).get('variables');
        expect(variables).toEqual([
            { name: 'open', value: true },
            { name: 'label', value: 'open' },
            { name: 'hits', value: 2 },
        ]);
    });

    test('a change for an entity the mirror no longer has is skipped', () => {
        const level = Level.createNew();
        const mirror = startMirror(level);
        const change = { entity: 999, component: 'TagsComponent', values: { tags: ['x'] } };

        expect(() => mirror.apply({ ...reportOf(1, []), changes: [change] })).not.toThrow();
    });

    test('a level the reader refuses is refused', () => {
        const levelData = new LevelWriter().write(Level.createNew());

        const mirrored = PlayMirror.start({ ...levelData, formatVersion: 999 });

        expect(mirrored.ok).toBe(false);
    });
});
