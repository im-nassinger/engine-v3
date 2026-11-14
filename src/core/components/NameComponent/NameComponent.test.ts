import { describe, expect, test } from 'vitest';

import { NameComponent } from './NameComponent.ts';

describe('NameComponent', () => {
    test('a name missing from a file reads as Entity', () => {
        expect(new NameComponent().get('name')).toBe('Entity');
    });

    test('an empty name, or one of only spaces, is refused', () => {
        const nameComponent = new NameComponent({ name: 'Crate' });
        const refusal = { ok: false, problem: { reason: 'tooShort', minLength: 1 } };

        expect(nameComponent.writeValue('name', '')).toEqual(refusal);
        expect(nameComponent.writeValue('name', '   ')).toEqual(refusal);
        expect(nameComponent.get('name')).toBe('Crate');
    });

    test('a name is trimmed and cut at 64 characters', () => {
        const nameComponent = new NameComponent();
        const longName = 'a'.repeat(70);

        nameComponent.writeValue('name', '  Crate  ');
        const trimmed = nameComponent.get('name');
        nameComponent.writeValue('name', longName);
        const cut = nameComponent.get('name');

        expect(trimmed).toBe('Crate');
        expect(cut).toBe('a'.repeat(64));
    });

    test("the name can't change during play and has no card", () => {
        const [nameField] = NameComponent.schema.fields;

        expect(nameField?.changeableInPlay).toBe(false);
        expect(NameComponent.schema.hasCard).toBe(false);
    });
});
