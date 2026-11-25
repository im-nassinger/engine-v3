import { describe, expect, test } from 'vitest';

import {
    BodyComponent,
    JointComponent,
    NameComponent,
    ShapeComponent,
    TransformComponent,
    TriggerComponent,
    createV1Registry,
} from '../../../core/components/index.ts';
import { DerivedCaches } from '../../../core/derived/index.ts';
import { Bounds } from '../../../core/geometry/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity, EntityId } from '../../../core/level/index.ts';
import type { Trigger } from '../../../core/fields/index.ts';
import { FormatUpgrader, LevelReader, LevelWriter, V1_LEVEL_LIMITS } from '../../../core/level-data/index.ts';

import { ClipboardCodec } from '../codec/ClipboardCodec.ts';
import type { EntityFragment } from '../codec/ClipboardText.ts';
import { IdRemapping } from './IdRemapping.ts';
import type { PasteTarget } from './IdRemapping.ts';

const registry = createV1Registry();
const writer = new LevelWriter();
const reader = new LevelReader(registry, V1_LEVEL_LIMITS, FormatUpgrader.createCurrent());
const codec = new ClipboardCodec(writer);
const remapping = new IdRemapping(registry);

function addBox(level: Level, name: string) {
    const box = level.createEntity(level.world, level.world.children.length);
    box.addComponent(new TransformComponent());
    box.addComponent(new NameComponent({ name }));
    box.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 40, height: 20 } }));
    box.addComponent(new BodyComponent());

    return box;
}

// Two bodies and a hinge joining them, with a group holding a second hinge to the first body.
function buildLevel() {
    const level = Level.createNew();
    const ball = addBox(level, 'Ball');
    const crate = addBox(level, 'Crate');

    const hinge = level.createEntity(level.world, level.world.children.length);
    hinge.addComponent(new TransformComponent());
    hinge.addComponent(new NameComponent({ name: 'Hinge' }));
    hinge.addComponent(new JointComponent({ ...JointComponent.schema.defaults(), a: ball.id, b: crate.id }));

    return { level, ball, crate, hinge };
}

function copy(level: Level, entities: readonly Entity[], sourceToken: string): EntityFragment {
    const text = codec.encode(entities, { level, caches: new DerivedCaches(level), sourceToken });
    const decoded = codec.decode(text);
    if (decoded.kind !== 'entities') throw new Error(`Expected entities, got ${decoded.kind}.`);

    return decoded.fragment;
}

// Checks, then reads: the order a paste follows.
function paste(fragment: EntityFragment, target: PasteTarget) {
    const data = remapping.remap(fragment, target);
    const parent = target.level.world;

    const checked = reader.checkSubtree(target.level, data, parent);
    if (!checked.ok) throw new Error(`The paste is refused: ${checked.refusal.reason}.`);

    const read = reader.readSubtree(target.level, data, parent, parent.children.length);
    if (!read.ok) throw new Error('readSubtree refused what checkSubtree accepted.');

    return read.value;
}

function endsOf(entity: Entity | undefined) {
    const joint = entity?.getComponent(JointComponent);
    if (joint === undefined) throw new Error('The entity has no JointComponent.');

    return { a: joint.get('a'), b: joint.get('b') };
}

function nameOf(entity: Entity | undefined) {
    return entity?.getComponent(NameComponent)?.get('name');
}

describe('IdRemapping', () => {
    test('a copied joint and its two bodies paste joined to each other', () => {
        const { level, ball, crate, hinge } = buildLevel();
        const fragment = copy(level, [ball, crate, hinge], 'opening-1');

        const [newBall, newCrate, newHinge] = paste(fragment, { level, sourceToken: 'opening-1' });

        const pastedIds = [newBall?.id, newCrate?.id, newHinge?.id];
        expect(pastedIds.some((id) => [ball.id, crate.id, hinge.id].includes(id ?? 0))).toBe(false);
        expect(endsOf(newHinge)).toEqual({ a: newBall?.id, b: newCrate?.id });
        expect(nameOf(newBall)).toBe('Ball');
        expect(endsOf(hinge)).toEqual({ a: ball.id, b: crate.id });
    });

    test('pasted into another level, a joint and its bodies are still joined to each other', () => {
        const { level, ball, crate, hinge } = buildLevel();
        const fragment = copy(level, [ball, crate, hinge], 'opening-1');
        const other = Level.createNew();

        const [newBall, newCrate, newHinge] = paste(fragment, { level: other, sourceToken: 'opening-2' });

        expect(endsOf(newHinge)).toEqual({ a: newBall?.id, b: newCrate?.id });
    });

    test('a joint copied alone keeps its bodies in the same opening', () => {
        const { level, ball, crate, hinge } = buildLevel();
        const fragment = copy(level, [hinge], 'opening-1');

        const [newHinge] = paste(fragment, { level, sourceToken: 'opening-1' });

        expect(newHinge?.id).not.toBe(hinge.id);
        expect(endsOf(newHinge)).toEqual({ a: ball.id, b: crate.id });
    });

    test('from another opening, a link outside the set points at an id no entity has', () => {
        const { level, hinge } = buildLevel();
        const fragment = copy(level, [hinge], 'opening-1');
        const reopened = reader.read(writer.write(level));
        if (!reopened.ok) throw new Error('The level does not read back.');
        const target = reopened.value;

        const [newHinge] = paste(fragment, { level: target, sourceToken: 'opening-2' });
        const { a, b } = endsOf(newHinge);

        expect(a).not.toBeNull();
        expect(b).not.toBeNull();
        expect(a).not.toBe(b);
        expect(target.findEntity(a ?? 0)).toBeUndefined();
        expect(target.findEntity(b ?? 0)).toBeUndefined();
        expect(target.createEntity(target.world, 0).id).toBeGreaterThan(Math.max(a ?? 0, b ?? 0));
    });

    test('a deleted target stays missing, and undo of the delete brings the link back', () => {
        const { level, crate, hinge } = buildLevel();
        const fragment = copy(level, [hinge], 'opening-1');
        const crateData = writer.writeSubtree([crate]);
        const crateIndex = level.world.children.indexOf(crate);
        level.removeEntity(crate);

        const [newHinge] = paste(fragment, { level, sourceToken: 'opening-1' });

        expect(endsOf(newHinge).b).toBe(crate.id);
        expect(level.findEntity(crate.id)).toBeUndefined();

        const restored = reader.readSubtree(level, crateData, level.world, crateIndex);

        expect(restored.ok).toBe(true);
        expect(nameOf(level.findEntity(endsOf(newHinge).b ?? 0))).toBe('Crate');
    });

    test('an empty link stays empty', () => {
        const { level, ball, hinge } = buildLevel();
        hinge.getComponent(JointComponent)?.set('b', null);
        const fragment = copy(level, [hinge, ball], 'opening-1');

        const [, newHinge] = paste(fragment, { level: Level.createNew(), sourceToken: 'opening-2' });

        expect(endsOf(newHinge).b).toBeNull();
    });

    test('new ids count up parents first, and the fragment is left as it was', () => {
        const level = Level.createNew();
        const fragment: EntityFragment = {
            sourceToken: 'opening-1',
            box: new Bounds(0, 0, 0, 0),
            entities: [
                {
                    id: 7,
                    hidden: false,
                    locked: false,
                    components: {},
                    children: [{ id: 3, hidden: false, locked: false, components: {}, children: [] }],
                },
            ],
        };
        const before = JSON.stringify(fragment);
        const firstFree = level.allocateId() + 1;

        const data = remapping.remap(fragment, { level, sourceToken: 'opening-1' });

        expect(data).toEqual([
            {
                id: firstFree,
                hidden: false,
                locked: false,
                components: {},
                children: [{ id: firstFree + 1, hidden: false, locked: false, components: {}, children: [] }],
            },
        ]);
        expect(JSON.stringify(fragment)).toBe(before);
    });

    test('damaged data is passed on as it is, for the reader to refuse', () => {
        const level = Level.createNew();
        const unknownComponent = { id: 10, components: { UnknownComponent: { a: { entity: 1 } } }, children: [] };
        const damaged = [
            'not an entity',
            { id: 'ten', components: { JointComponent: { a: { entity: -1 }, b: 'none' } }, children: {} },
            unknownComponent,
        ];
        const fragment: EntityFragment = { sourceToken: 'opening-1', box: new Bounds(0, 0, 0, 0), entities: damaged };

        const data = remapping.remap(fragment, { level, sourceToken: 'opening-2' });

        expect(data[0]).toBe('not an entity');
        expect(data[1]).toEqual(damaged[1]);
        expect(data[2]).toEqual({ ...unknownComponent, id: expect.any(Number) as unknown });
        expect(reader.checkSubtree(level, data, level.world).ok).toBe(false);
    });
});

// A button whose trigger, when touched, checks the door's tag and destroys the door.
function buildButtonAndDoor() {
    const level = Level.createNew();
    const door = addBox(level, 'Door');
    const button = addBox(level, 'Button');
    const opens: Trigger = {
        id: 1,
        name: null,
        on: true,
        when: { kind: 'touched' },
        checks: [
            {
                kind: 'value',
                target: { kind: 'entity', entity: door.id },
                value: { kind: 'tag' },
                compare: 'is',
                amount: 'door',
            },
        ],
        actions: [{ kind: 'destroy', target: { kind: 'entity', entity: door.id } }, { kind: 'win' }],
    };
    button.addComponent(new TriggerComponent({ triggers: [opens], nextTriggerId: 2 }));

    return { level, door, button };
}

// The entities the button's trigger names: its check's target, then its first action's.
function linksOf(entity: Entity | undefined): readonly (EntityId | null)[] {
    const [trigger] = entity?.getComponent(TriggerComponent)?.get('triggers') ?? [];
    if (trigger === undefined) throw new Error('The entity has no trigger.');

    return [...trigger.checks, ...trigger.actions].flatMap((part) =>
        'target' in part && part.target.kind === 'entity' ? [part.target.entity] : [],
    );
}

describe('IdRemapping: triggers', () => {
    test("a copied button and door paste with the new button's trigger naming the new door", () => {
        const { level, door, button } = buildButtonAndDoor();
        const fragment = copy(level, [door, button], 'opening-1');

        const [newDoor, newButton] = paste(fragment, { level, sourceToken: 'opening-1' });

        expect(newDoor?.id).not.toBe(door.id);
        expect(linksOf(newButton)).toEqual([newDoor?.id, newDoor?.id]);
        expect(linksOf(button)).toEqual([door.id, door.id]);
    });

    test('pasted into another level, the button and door still name each other', () => {
        const { level, door, button } = buildButtonAndDoor();
        const fragment = copy(level, [door, button], 'opening-1');

        const [newDoor, newButton] = paste(fragment, { level: Level.createNew(), sourceToken: 'opening-2' });

        expect(linksOf(newButton)).toEqual([newDoor?.id, newDoor?.id]);
    });

    test('a button copied alone keeps naming the original door in the same level', () => {
        const { level, door, button } = buildButtonAndDoor();
        const fragment = copy(level, [button], 'opening-1');

        const [newButton] = paste(fragment, { level, sourceToken: 'opening-1' });

        expect(linksOf(newButton)).toEqual([door.id, door.id]);
    });

    test('a button copied alone into another level names a missing entity', () => {
        const { level, button } = buildButtonAndDoor();
        const fragment = copy(level, [button], 'opening-1');
        const other = Level.createNew();

        const [newButton] = paste(fragment, { level: other, sourceToken: 'opening-2' });
        const [checked, destroyed] = linksOf(newButton);

        expect(checked).toBe(destroyed);
        expect(other.findEntity(checked ?? 0)).toBeUndefined();
        expect(checked).not.toBeNull();
    });
});
