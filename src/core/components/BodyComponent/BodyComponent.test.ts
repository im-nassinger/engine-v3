import { describe, expect, test } from 'vitest';

import { BodyComponent } from './BodyComponent.ts';

function fieldsThatApply(body: BodyComponent) {
    const values = body.schema.defaults();
    for (const field of body.schema.fields) {
        Object.assign(values, { [field.key]: body.get(field.key) });
    }

    const applying = body.schema.fields.filter((field) => field.appliesWhen?.(values) ?? true);
    return applying.map((field) => field.key);
}

describe('BodyComponent', () => {
    test('a new body is Dynamic, merges, and pulls normally', () => {
        const body = new BodyComponent();

        expect(body.get('type')).toBe('dynamic');
        expect(body.get('gravityScale')).toBe(1);
        expect(body.get('merge')).toBe(true);
    });

    test('only Type and Merge apply to a Static or Kinematic body; the rest are greyed, values kept', () => {
        const body = new BodyComponent();
        body.set('gravityScale', -2);
        body.set('type', 'static');

        expect(fieldsThatApply(body)).toEqual(['type', 'merge']);
        expect(body.get('gravityScale')).toBe(-2);

        body.set('type', 'dynamic');
        expect(fieldsThatApply(body)).toHaveLength(7);
    });

    test('every value but Merge can change during play', () => {
        const fixedInPlay = BodyComponent.schema.fields.filter((field) => !field.changeableInPlay);
        const fixedKeys = fixedInPlay.map((field) => field.key);

        expect(fixedKeys).toEqual(['merge']);
    });

    test('it asks for a SurfaceComponent only when the entity has a shape', () => {
        expect(BodyComponent.schema.partners).toEqual([
            {
                partner: 'SurfaceComponent',
                onlyWith: 'ShapeComponent',
                noteText: 'Needs a SurfaceComponent to collide.',
            },
        ]);
    });
});
