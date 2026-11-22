import { describe, expect, test } from 'vitest';

import { VariablesComponent } from './VariablesComponent.ts';

describe('VariablesComponent', () => {
    test('a new one has no variables, and its card is the 12th', () => {
        const variables = new VariablesComponent();

        expect(variables.get('variables')).toEqual([]);
        expect(VariablesComponent.schema.cardOrder).toBe(12);
        expect(VariablesComponent.schema.hasCard).toBe(true);
    });

    test('a written variable keeps its number, its name made a word name', () => {
        const variables = new VariablesComponent();

        variables.writeValue('variables', [{ name: 'Extra lives', value: 3 }]);

        expect(variables.get('variables')).toEqual([{ name: 'extra_lives', value: 3 }]);
    });

    test('two variables with one name are refused, and the variables stay', () => {
        const variables = new VariablesComponent({ variables: [{ name: 'coins', value: 0 }] });

        const outcome = variables.writeValue('variables', [
            { name: 'coins', value: 0 },
            { name: 'COINS', value: 1 },
        ]);

        expect(outcome).toEqual({ ok: false, problem: { reason: 'repeatedName', name: 'coins' } });
        expect(variables.get('variables')).toEqual([{ name: 'coins', value: 0 }]);
    });

    test('it is in the Add Component menu, and its values change during play', () => {
        const [variablesField] = VariablesComponent.schema.fields;

        expect(VariablesComponent.schema.addableByHand).toBe(true);
        expect(VariablesComponent.schema.addMenuSection).toBe('Logic');
        expect(variablesField?.changeableInPlay).toBe(true);
    });
});
