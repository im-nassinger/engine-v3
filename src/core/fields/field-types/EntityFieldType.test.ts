import { describe, expect, test } from 'vitest';

import { EntityFieldType } from './EntityFieldType.ts';

describe('EntityFieldType', () => {
    const fieldType = new EntityFieldType();

    test('parse reads { entity: id } and null', () => {
        expect(fieldType.parse({ entity: 12 })).toEqual({ ok: true, value: 12 });
        expect(fieldType.parse(null)).toEqual({ ok: true, value: null });
    });

    test('parse refuses a bare number, so the stored shape stays open for later kinds of target', () => {
        expect(fieldType.parse(12)).toEqual({ ok: false, problem: { reason: 'wrongType' } });
    });

    test('parse refuses other shapes', () => {
        for (const raw of [undefined, { tag: 'player' }, { entity: 1, tag: 'player' }, [12]]) {
            expect(fieldType.parse(raw)).toEqual({ ok: false, problem: { reason: 'wrongType' } });
        }
    });

    test('parse refuses an id that is not a whole number from 1', () => {
        for (const id of [0, -3, 1.5, '12', Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
            expect(fieldType.parse({ entity: id })).toEqual({ ok: false, problem: { reason: 'badEntityId' } });
        }
    });

    test('serialize writes the same shape parse reads', () => {
        expect(fieldType.serialize(12)).toEqual({ entity: 12 });
        expect(fieldType.serialize(null)).toBeNull();
    });
});
