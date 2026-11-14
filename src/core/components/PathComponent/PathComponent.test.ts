import { describe, expect, test } from 'vitest';

import { PathComponent } from './PathComponent.ts';

describe('PathComponent', () => {
    test('a new one is a straight open path of two sharp points', () => {
        const path = new PathComponent();

        expect(path.get('path').closed).toBe(false);
        expect(path.readDerived('points')).toBe(2);
        expect(path.get('path').points.every((point) => point.corner === 'sharp')).toBe(true);
    });

    test('it is never added by hand in v1, and Points is read-only', () => {
        const path = new PathComponent();

        expect(PathComponent.schema.addableByHand).toBe(false);
        expect(() => path.writeDerived('points', 3)).toThrow();
    });
});
