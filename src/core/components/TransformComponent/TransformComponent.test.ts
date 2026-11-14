import { describe, expect, test } from 'vitest';

import { TransformComponent } from './TransformComponent.ts';

describe('TransformComponent', () => {
    test('a new one sits at the origin, unturned and unstretched', () => {
        const transform = new TransformComponent();

        expect(transform.get('position')).toEqual({ x: 0, y: 0 });
        expect(transform.get('rotation')).toBe(0);
        expect(transform.get('scale')).toEqual({ x: 1, y: 1 });
        expect(transform.get('skew')).toBe(0);
    });

    test('a scale of 0 is refused', () => {
        const transform = new TransformComponent();

        const outcome = transform.writeValue('scale', { x: 0, y: 2 });

        expect(outcome).toEqual({ ok: false, problem: { reason: 'zero' } });
        expect(transform.get('scale')).toEqual({ x: 1, y: 1 });
    });

    test('a skew of 90 or -90 degrees, or past them, is refused', () => {
        const transform = new TransformComponent();
        const refusal = { ok: false, problem: { reason: 'outsideLimits', min: -90, max: 90 } };

        expect(transform.writeValue('skew', 90)).toEqual(refusal);
        expect(transform.writeValue('skew', -90)).toEqual(refusal);
        expect(transform.writeValue('skew', 120)).toEqual(refusal);
        expect(transform.writeValue('skew', 89.5)).toEqual({ ok: true, value: 89.5 });
    });

    test('only position and rotation can change during play', () => {
        const changeable = TransformComponent.schema.fields.filter((field) => field.changeableInPlay);
        const changeableKeys = changeable.map((field) => field.key);

        expect(changeableKeys).toEqual(['position', 'rotation']);
    });
});
