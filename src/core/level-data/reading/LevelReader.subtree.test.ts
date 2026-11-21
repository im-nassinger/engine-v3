import { describe, expect, test } from 'vitest';

import { CameraComponent, createV1Registry, NameComponent, TransformComponent } from '../../components/index.ts';
import { Level } from '../../level/index.ts';
import type { Entity } from '../../level/index.ts';

import { FormatUpgrader } from '../versions/FormatUpgrader.ts';
import type { LevelLimits } from '../LevelLimits.ts';
import { V1_LEVEL_LIMITS } from '../LevelLimits.ts';
import { LevelReader } from './LevelReader.ts';
import { LevelWriter } from '../writing/LevelWriter.ts';

// The test level holds 6 entities, the deepest 2 deep.
const SMALL_LIMITS: LevelLimits = {
    maxEntities: 7,
    maxDepth: 2,
    maxShapePoints: 4,
    maxPathPoints: 6,
    maxBytes: 1000,
    maxLevelSize: 200_000,
};

function createReader(limits = V1_LEVEL_LIMITS) {
    return new LevelReader(createV1Registry(), limits, FormatUpgrader.createV1());
}

function addNamed(level: Level, parent: Entity, name: string, skew = 0) {
    const entity = level.createEntity(parent, parent.children.length);
    entity.addComponent(
        new TransformComponent({ position: { x: 3, y: 4 }, rotation: 20, scale: { x: 2, y: 1 }, skew }),
    );
    entity.addComponent(new NameComponent({ name }));

    return entity;
}

// The World, its camera, a square, and a group holding two skewed children, the second one hidden.
function buildLevel() {
    const level = Level.createNew();
    const square = addNamed(level, level.world, 'Square');
    const group = addNamed(level, level.world, 'Group 1');
    addNamed(level, group, 'First', 30);
    const second = addNamed(level, group, 'Second', -45);
    second.setHidden(true);

    return { level, square, group };
}

function plainEntity(id: number, components: Record<string, unknown> = {}, children: unknown[] = []) {
    return { id, hidden: false, locked: false, components, children };
}

function expectDamaged(level: Level, data: unknown) {
    const countBefore = level.entityCount;
    const outcome = createReader().readSubtree(level, data, level.world, 0);

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.refusal.reason).toBe('damaged');
    expect(level.entityCount).toBe(countBefore);
}

describe('LevelReader.readSubtree', () => {
    test('puts a removed group back with the same ids, values, switches and order', () => {
        const { level, group } = buildLevel();
        const writer = new LevelWriter();
        const before = writer.write(level);
        const data = writer.writeSubtree([group]);
        const index = level.world.children.indexOf(group);

        level.removeEntity(group);
        const outcome = createReader().readSubtree(level, data, level.world, index);

        expect(outcome.ok).toBe(true);
        if (!outcome.ok) return;
        expect(outcome.value.map((root) => root.id)).toEqual([group.id]);
        expect(writer.write(level)).toEqual(before);
    });

    test('puts several roots in from the index on, in their order', () => {
        const { level, square, group } = buildLevel();
        const writer = new LevelWriter();
        const before = writer.write(level);
        const data = writer.writeSubtree([square, group]);

        level.removeEntity(square);
        level.removeEntity(group);
        const outcome = createReader().readSubtree(level, data, level.world, 1);

        expect(outcome.ok).toBe(true);
        expect(writer.write(level)).toEqual(before);
    });

    test('puts a subtree into another parent at any depth', () => {
        const { level, square, group } = buildLevel();
        const data = new LevelWriter().writeSubtree([square]);

        level.removeEntity(square);
        const outcome = createReader().readSubtree(level, data, group, 1);

        expect(outcome.ok).toBe(true);
        expect(group.children[1]?.id).toBe(square.id);
        expect(group.children[1]?.depth).toBe(2);
    });

    test('refuses data that is not a list of entities, or an empty list', () => {
        const { level } = buildLevel();

        expectDamaged(level, { id: 10 });
        expectDamaged(level, []);
        expectDamaged(level, [{ id: 10 }]);
    });

    test('refuses an id already in the level, or used twice, and leaves the level as it was', () => {
        const { level, square } = buildLevel();

        expectDamaged(level, [plainEntity(10, {}, [plainEntity(square.id)])]);
        expectDamaged(level, [plainEntity(10), plainEntity(10)]);
        expectDamaged(level, [plainEntity(10, {}, [plainEntity(10)])]);
    });

    test('refuses an entity without its children, or children that are not a list', () => {
        const { level } = buildLevel();
        const childless: Record<string, unknown> = plainEntity(10);
        delete childless['children'];

        expectDamaged(level, [childless]);
        expectDamaged(level, [{ ...plainEntity(10), children: {} }]);
    });

    test('refuses a camera or a PhysicsWorldComponent', () => {
        const { level } = buildLevel();

        expectDamaged(level, [plainEntity(10, { [CameraComponent.schema.typeName]: {} })]);
        expectDamaged(level, [plainEntity(10, {}, [plainEntity(11, { PhysicsWorldComponent: {} })])]);
    });

    test('refuses a damaged component value', () => {
        const { level } = buildLevel();

        expectDamaged(level, [plainEntity(10, { NameComponent: { name: '' } })]);
    });

    test('counts the entities and the depth from the level it goes into', () => {
        const { level, group } = buildLevel();
        const first = group.children[0];
        if (first === undefined) throw new Error('The test level has no first child.');
        const reader = createReader(SMALL_LIMITS);

        const tooDeep = reader.readSubtree(level, [plainEntity(10)], first, 0);
        const twoMore = reader.readSubtree(level, [plainEntity(11), plainEntity(12)], level.world, 0);

        const nestedTooDeep = reader.readSubtree(level, [plainEntity(14, {}, [plainEntity(15)])], group, 0);

        expect(nestedTooDeep).toEqual({ ok: false, refusal: { reason: 'overLimit', limit: 'depth', max: 2 } });
        expect(tooDeep).toEqual({ ok: false, refusal: { reason: 'overLimit', limit: 'depth', max: 2 } });
        expect(twoMore).toEqual({ ok: false, refusal: { reason: 'overLimit', limit: 'entities', max: 7 } });
        expect(reader.readSubtree(level, [plainEntity(13)], group, 0).ok).toBe(true);
    });

    test('throws on an index that is not a place among the children', () => {
        const { level } = buildLevel();
        const outOfRange = level.world.children.length + 1;

        const read = () => createReader().readSubtree(level, [plainEntity(10)], level.world, outOfRange);

        expect(read).toThrow(`Index ${outOfRange} is not a place among entity ${level.world.id}'s children.`);
    });
});

describe('LevelReader.checkSubtree', () => {
    test('accepts what readSubtree accepts and leaves the level as it was', () => {
        const { level, group } = buildLevel();
        const writer = new LevelWriter();
        const before = writer.write(level);
        const data = [plainEntity(10, { NameComponent: { name: 'Pasted' } }, [plainEntity(11)])];

        expect(createReader().checkSubtree(level, data, group)).toEqual({ ok: true });
        expect(writer.write(level)).toEqual(before);
        expect(level.findEntity(10)).toBeUndefined();
    });

    test('refuses what readSubtree refuses, with the same refusal, and changes nothing', () => {
        const { level, square, group } = buildLevel();
        const first = group.children[0];
        if (first === undefined) throw new Error('The test level has no first child.');
        const writer = new LevelWriter();
        const before = writer.write(level);
        const reader = createReader(SMALL_LIMITS);
        const cases: { data: unknown; parent: Entity }[] = [
            { data: [], parent: level.world },
            { data: [plainEntity(square.id)], parent: level.world },
            { data: [plainEntity(10), plainEntity(10)], parent: level.world },
            { data: [plainEntity(10, { [CameraComponent.schema.typeName]: {} })], parent: level.world },
            { data: [plainEntity(10, { NameComponent: { name: '' } })], parent: level.world },
            { data: [plainEntity(10)], parent: first },
            { data: [plainEntity(10), plainEntity(11)], parent: level.world },
        ];

        for (const { data, parent } of cases) {
            const checked = reader.checkSubtree(level, data, parent);
            const countBefore = level.entityCount;
            const read = reader.readSubtree(level, data, parent, 0);

            expect(checked.ok).toBe(false);
            expect(read.ok).toBe(false);
            if (checked.ok || read.ok) continue;
            expect(checked.refusal).toEqual(read.refusal);
            expect(level.entityCount).toBe(countBefore);
        }

        expect(writer.write(level)).toEqual(before);
    });
});
