import { describe, expect, test } from 'vitest';

import { PathGeometryValue } from './PathGeometryValue.ts';

const sharpPoint = { x: 0, y: 0, handle_in: null, handle_out: null, corner: 'sharp' };
const smoothPoint = { x: 100, y: 20, handle_in: { x: -10, y: 0 }, handle_out: { x: 10, y: 0 }, corner: 'smooth' };

describe('PathGeometryValue', () => {
    const valueType = new PathGeometryValue();

    test('a round trip keeps the points, their handles and their corners', () => {
        const raw = { closed: false, points: [sharpPoint, smoothPoint] };

        const parsed = valueType.parse(raw);
        if (!parsed.ok) throw new Error('The path should parse.');
        const saved = valueType.serialize(parsed.value);

        expect(parsed.value.points[1]).toEqual({
            x: 100,
            y: 20,
            handleIn: { x: -10, y: 0 },
            handleOut: { x: 10, y: 0 },
            corner: 'smooth',
        });
        expect(saved).toEqual(raw);
    });

    test('an open path keeps at least 2 points, a closed one 3', () => {
        expect(valueType.parse({ closed: false, points: [sharpPoint] })).toEqual({
            ok: false,
            problem: { reason: 'tooFewPoints', minCount: 2 },
        });
        expect(valueType.parse({ closed: true, points: [sharpPoint, smoothPoint] })).toEqual({
            ok: false,
            problem: { reason: 'tooFewPoints', minCount: 3 },
        });
    });

    test('parse refuses an unknown corner, a missing key and a bad handle', () => {
        const unknownCorner = { ...sharpPoint, corner: 'round' };
        const missingHandle = { x: 0, y: 0, handle_out: null, corner: 'sharp' };
        const badHandle = { ...sharpPoint, handle_in: { x: 'left', y: 0 } };

        expect(valueType.parse({ closed: false, points: [sharpPoint, unknownCorner] })).toEqual({
            ok: false,
            problem: { reason: 'unknownChoice' },
        });
        expect(valueType.parse({ closed: false, points: [sharpPoint, missingHandle] })).toEqual({
            ok: false,
            problem: { reason: 'wrongType' },
        });
        expect(valueType.parse({ closed: false, points: [sharpPoint, badHandle] })).toEqual({
            ok: false,
            problem: { reason: 'wrongType' },
        });
        expect(valueType.parse({ closed: 'no', points: [] })).toEqual({ ok: false, problem: { reason: 'wrongType' } });
    });

    test('clone shares nothing and equals sees a moved handle', () => {
        const parsed = valueType.parse({ closed: false, points: [sharpPoint, smoothPoint] });
        if (!parsed.ok) throw new Error('The path should parse.');

        const cloned = valueType.clone(parsed.value);
        const movedHandle = valueType.parse({
            closed: false,
            points: [sharpPoint, { ...smoothPoint, handle_out: { x: 12, y: 0 } }],
        });
        if (!movedHandle.ok) throw new Error('The path should parse.');

        expect(valueType.equals(cloned, parsed.value)).toBe(true);
        expect(cloned.points[1]?.handleOut).not.toBe(parsed.value.points[1]?.handleOut);
        expect(valueType.equals(movedHandle.value, parsed.value)).toBe(false);
    });
});
