import { describe, expect, test } from 'vitest';

import { VariableEdits } from './VariableEdits.ts';

const coinsAndLives = [
    { name: 'coins', value: 0 },
    { name: 'lives', value: 3 },
];

describe('VariableEdits', () => {
    test('a new variable is 0, named with the first number not taken', () => {
        expect(VariableEdits.withNewVariable([])).toEqual([{ name: 'variable_1', value: 0 }]);
        expect(
            VariableEdits.withNewVariable([
                { name: 'variable_1', value: 5 },
                { name: 'variable_3', value: 0 },
            ]),
        ).toEqual([
            { name: 'variable_1', value: 5 },
            { name: 'variable_3', value: 0 },
            { name: 'variable_2', value: 0 },
        ]);
    });

    test('renamed and withValue change one variable and keep the others', () => {
        expect(VariableEdits.renamed(coinsAndLives, 0, 'gems')).toEqual([
            { name: 'gems', value: 0 },
            { name: 'lives', value: 3 },
        ]);
        expect(VariableEdits.withValue(coinsAndLives, 1, 5)).toEqual([
            { name: 'coins', value: 0 },
            { name: 'lives', value: 5 },
        ]);
    });

    test('without removes one variable and keeps the order of the others', () => {
        expect(VariableEdits.without(coinsAndLives, 0)).toEqual([{ name: 'lives', value: 3 }]);
    });

    test('every edit gives a fresh list, leaving the one given as it was', () => {
        const edited = VariableEdits.withValue(coinsAndLives, 0, 9);

        expect(edited).not.toBe(coinsAndLives);
        expect(coinsAndLives[0]).toEqual({ name: 'coins', value: 0 });
    });
});
