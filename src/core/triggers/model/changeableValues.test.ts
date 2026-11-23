import { describe, expect, test } from 'vitest';

import {
    NameComponent,
    TagsComponent,
    TransformComponent,
    TriggerComponent,
    VariablesComponent,
    createV1Registry,
} from '../../components/index.ts';
import type { Trigger } from '../../fields/index.ts';
import { Level } from '../../level/index.ts';

import { changeableValues, sameValueRef } from './changeableValues.ts';

const registry = createV1Registry();

function trigger(id: number): Trigger {
    return { id, name: null, on: true, when: null, checks: [], actions: [], repeat: { kind: 'everyTime' } };
}

function buildCoin() {
    const level = Level.createNew();
    const coin = level.createEntity(level.world, 0);
    coin.addComponent(new TransformComponent());
    coin.addComponent(new NameComponent({ name: 'Coin' }));
    coin.addComponent(new TagsComponent({ tags: ['coin'] }));
    coin.addComponent(new VariablesComponent({ variables: [{ name: 'worth', value: 1 }] }));
    coin.addComponent(new TriggerComponent({ triggers: [trigger(1), trigger(3)], nextTriggerId: 4 }));

    return coin;
}

describe('changeableValues', () => {
    test("offers an entity's changeable fields (a vector whole), its tag, its variables and each trigger's on/off", () => {
        const offers = changeableValues(buildCoin(), registry).map(({ ref, ops }) => ({ ref, ops }));

        expect(offers).toEqual([
            {
                ref: { kind: 'field', component: 'TransformComponent', field: 'position' },
                ops: ['set', 'add', 'subtract'],
            },
            {
                ref: { kind: 'field', component: 'TransformComponent', field: 'rotation' },
                ops: ['set', 'add', 'subtract'],
            },
            { ref: { kind: 'tag' }, ops: ['add', 'subtract'] },
            { ref: { kind: 'variable', name: 'worth', own: true }, ops: ['set', 'add', 'subtract'] },
            { ref: { kind: 'triggerOn', trigger: 1 }, ops: ['set'] },
            { ref: { kind: 'triggerOn', trigger: 3 }, ops: ['set'] },
        ]);
    });

    test('never offers a value that is not allowed to change in play, nor a list whole', () => {
        const refs = changeableValues(buildCoin(), registry).map((offer) => offer.ref);
        const fields = refs.flatMap((ref) => (ref.kind === 'field' ? [ref.field] : []));

        expect(fields).not.toContain('scale');
        expect(fields).not.toContain('name');
        expect(fields).not.toContain('variables');
        expect(fields).not.toContain('triggers');
    });

    test("an amount is read with the value's own type", () => {
        const offers = changeableValues(buildCoin(), registry);
        const rotation = offers.find((offer) => offer.ref.kind === 'field' && offer.ref.field === 'rotation');
        const trigger = offers.find((offer) => offer.ref.kind === 'triggerOn');
        const tag = offers.find((offer) => offer.ref.kind === 'tag');

        expect(rotation?.amountType.parse(90).ok).toBe(true);
        expect(trigger?.amountType.parse(false).ok).toBe(true);
        expect(trigger?.amountType.parse(1).ok).toBe(false);
        expect(tag?.amountType.parse('hurt').ok).toBe(true);
        expect(tag?.amountType.parse('').ok).toBe(false);
    });

    test('with no entity known while editing, offers every registered component, so a later one needs no trigger code', () => {
        const components = new Set(
            changeableValues(undefined, registry).flatMap((offer) =>
                offer.ref.kind === 'field' ? [offer.ref.component] : [],
            ),
        );

        expect(components).toContain('BodyComponent');
        expect(components).toContain('CameraComponent');
        expect(components).toContain('JointComponent');
        expect(components).not.toContain('NameComponent');
    });

    test('sameValueRef compares the kind, the names and the axis', () => {
        const position = { kind: 'field', component: 'TransformComponent', field: 'position' } as const;

        expect(sameValueRef(position, { ...position })).toBe(true);
        expect(sameValueRef(position, { ...position, axis: 'x' })).toBe(false);
        expect(sameValueRef({ kind: 'variable', name: 'coins' }, { kind: 'variable', name: 'lives' })).toBe(false);
        expect(sameValueRef({ kind: 'tag' }, { kind: 'tag' })).toBe(true);
        expect(sameValueRef({ kind: 'triggerOn', trigger: 2 }, { kind: 'triggerOn', trigger: 2 })).toBe(true);
        expect(sameValueRef({ kind: 'triggerOn', trigger: 2 }, { kind: 'tag' })).toBe(false);
    });

    test('offers own variables with the ops their type allows: Flip for booleans, Set only for strings', () => {
        const level = Level.createNew();
        const door = level.createEntity(level.world, 0);
        const variables = [
            { name: 'health', value: 3 },
            { name: 'label', value: 'shut' },
            { name: 'door_open', value: false },
        ];
        door.addComponent(new VariablesComponent({ variables }));

        const offers = changeableValues(door, registry);
        const ops = offers.map(({ ref, ops }) => ({ ref, ops }));
        const label = offers.find((offer) => offer.ref.kind === 'variable' && offer.ref.name === 'label');
        const open = offers.find((offer) => offer.ref.kind === 'variable' && offer.ref.name === 'door_open');

        expect(ops).toEqual([
            { ref: { kind: 'variable', name: 'health', own: true }, ops: ['set', 'add', 'subtract'] },
            { ref: { kind: 'variable', name: 'label', own: true }, ops: ['set'] },
            { ref: { kind: 'variable', name: 'door_open', own: true }, ops: ['set', 'flip'] },
        ]);
        expect(label?.amountType.parse('open').ok).toBe(true);
        expect(label?.amountType.parse(1).ok).toBe(false);
        expect(open?.amountType.parse(true).ok).toBe(true);
    });

    test("offers the World's variables as the level's, named as v3 saved them", () => {
        const level = Level.createNew();
        level.world.addComponent(new VariablesComponent({ variables: [{ name: 'coins', value: 0 }] }));

        const refs = changeableValues(level.world, registry).map((offer) => offer.ref);

        expect(refs).toContainEqual({ kind: 'variable', name: 'coins' });
        expect(refs).not.toContainEqual({ kind: 'variable', name: 'coins', own: true });
    });

    test("sameValueRef tells the level's variable from an own one of the same name", () => {
        expect(sameValueRef({ kind: 'variable', name: 'coins' }, { kind: 'variable', name: 'coins', own: true })).toBe(
            false,
        );
        expect(
            sameValueRef(
                { kind: 'variable', name: 'coins', own: true },
                { kind: 'variable', name: 'coins', own: true },
            ),
        ).toBe(true);
    });
});
