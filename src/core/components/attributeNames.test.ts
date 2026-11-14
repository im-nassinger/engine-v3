import { describe, expect, test } from 'vitest';

import { camelCaseOfLabel, snakeCaseOfKey, snakeCaseOfLabel } from './attributeNames.ts';

describe('attribute names', () => {
    test('the key is the camelCase of the label', () => {
        expect(camelCaseOfLabel('Linear damping')).toBe('linearDamping');
        expect(camelCaseOfLabel('Let connected objects collide')).toBe('letConnectedObjectsCollide');
        expect(camelCaseOfLabel('Position')).toBe('position');
    });

    test('the attribute is the snake_case of the label', () => {
        expect(snakeCaseOfLabel('Linear damping')).toBe('linear_damping');
        expect(snakeCaseOfLabel('Position')).toBe('position');
    });
});

describe('file keys of stored values', () => {
    test('a stored value is saved under its key in snake_case', () => {
        expect(snakeCaseOfKey('geometry')).toBe('geometry');
        expect(snakeCaseOfKey('fixedSize')).toBe('fixed_size');
    });
});
