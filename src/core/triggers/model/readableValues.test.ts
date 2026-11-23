import { describe, expect, test } from 'vitest';

import { BodyComponent, TransformComponent, createV1Registry } from '../../components/index.ts';
import { Level } from '../../level/index.ts';

import { readableValues, sameReadableValue } from './readableValues.ts';

const registry = createV1Registry();

describe('readableValues', () => {
    test("offers an entity's number values and each axis of its vectors, in card order", () => {
        const level = Level.createNew();
        const crate = level.createEntity(level.world, 0);
        crate.addComponent(new TransformComponent());

        expect(readableValues(crate, registry)).toEqual([
            { kind: 'field', component: 'TransformComponent', field: 'position', axis: 'x' },
            { kind: 'field', component: 'TransformComponent', field: 'position', axis: 'y' },
            { kind: 'field', component: 'TransformComponent', field: 'rotation' },
            { kind: 'field', component: 'TransformComponent', field: 'scale', axis: 'x' },
            { kind: 'field', component: 'TransformComponent', field: 'scale', axis: 'y' },
            { kind: 'field', component: 'TransformComponent', field: 'skew' },
        ]);
    });

    test("a body also offers its speed and velocity, after its components' values", () => {
        const level = Level.createNew();
        const ball = level.createEntity(level.world, 0);
        ball.addComponent(new TransformComponent());
        ball.addComponent(new BodyComponent());

        const values = readableValues(ball, registry);

        expect(values.slice(-3)).toEqual([
            { kind: 'live', live: 'speed' },
            { kind: 'live', live: 'velocityX' },
            { kind: 'live', live: 'velocityY' },
        ]);
        expect(values.some((value) => value.kind === 'field' && value.component === 'BodyComponent')).toBe(true);
    });

    test('with no entity known while editing, offers every registered component and the live values', () => {
        const values = readableValues(undefined, registry);
        const components = new Set(values.flatMap((value) => (value.kind === 'field' ? [value.component] : [])));

        expect(components).toContain('BodyComponent');
        expect(components).toContain('CameraComponent');
        expect(values).toContainEqual({ kind: 'live', live: 'speed' });
    });

    test('sameReadableValue compares the field and the axis, or the live value', () => {
        const position = { kind: 'field', component: 'TransformComponent', field: 'position', axis: 'x' } as const;

        expect(sameReadableValue(position, { ...position })).toBe(true);
        expect(sameReadableValue(position, { ...position, axis: 'y' })).toBe(false);
        expect(sameReadableValue({ kind: 'live', live: 'speed' }, { kind: 'live', live: 'speed' })).toBe(true);
        expect(sameReadableValue({ kind: 'live', live: 'speed' }, position)).toBe(false);
    });
});
