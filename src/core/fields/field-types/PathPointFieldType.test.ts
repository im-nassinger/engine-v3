import { describe, expect, test } from 'vitest';

import { PathPointFieldType } from './PathPointFieldType.ts';

const savedSmooth = { x: 10, y: 20, handle_in: { x: -5, y: 0 }, handle_out: { x: 8, y: 1 }, corner: 'smooth' };
const smooth = { x: 10, y: 20, handleIn: { x: -5, y: 0 }, handleOut: { x: 8, y: 1 }, corner: 'smooth' } as const;

describe('PathPointFieldType', () => {
    const pointType = new PathPointFieldType();

    test('its kind is pathPoint', () => {
        expect(pointType.kind).toBe('pathPoint');
    });

    test('parse reads the stored shape, and serialize writes it back', () => {
        const parsed = pointType.parse(savedSmooth);

        expect(parsed).toEqual({ ok: true, value: smooth });
        expect(pointType.serialize(smooth)).toEqual(savedSmooth);
    });

    test('parse takes a null handle, as an end of an open path has', () => {
        const saved = { ...savedSmooth, handle_in: null };

        expect(pointType.parse(saved)).toEqual({ ok: true, value: { ...smooth, handleIn: null } });
    });

    test('parse refuses a wrong shape, a missing key, an unknown corner and a number that is not finite', () => {
        const missingCorner = { x: 0, y: 0, handle_in: null, handle_out: null };
        const extraKey = { ...savedSmooth, weight: 1 };
        const badHandle = { ...savedSmooth, handle_out: { x: 1 } };

        expect(pointType.parse(null)).toEqual({ ok: false, problem: { reason: 'wrongType' } });
        expect(pointType.parse(missingCorner)).toEqual({ ok: false, problem: { reason: 'wrongType' } });
        expect(pointType.parse(extraKey)).toEqual({ ok: false, problem: { reason: 'wrongType' } });
        expect(pointType.parse(badHandle)).toEqual({ ok: false, problem: { reason: 'wrongType' } });
        expect(pointType.parse({ ...savedSmooth, corner: 'round' })).toEqual({
            ok: false,
            problem: { reason: 'unknownChoice' },
        });
        expect(pointType.parse({ ...savedSmooth, x: NaN })).toEqual({ ok: false, problem: { reason: 'notFinite' } });
    });

    test('normalize drops a sharp point’s handles and keeps a curved one’s', () => {
        const sharp = { ...smooth, corner: 'sharp' } as const;

        expect(pointType.normalize(sharp)).toEqual({ x: 10, y: 20, handleIn: null, handleOut: null, corner: 'sharp' });
        expect(pointType.normalize(smooth)).toEqual(smooth);
    });

    test('clone copies the handles, and equals compares the place, the handles and the corner', () => {
        const copy = pointType.clone(smooth);

        expect(copy).toEqual(smooth);
        expect(copy.handleIn).not.toBe(smooth.handleIn);
        expect(pointType.equals(copy, smooth)).toBe(true);
        expect(pointType.equals(smooth, { ...smooth, corner: 'separate' })).toBe(false);
        expect(pointType.equals(smooth, { ...smooth, handleIn: null })).toBe(false);
        expect(pointType.equals(smooth, { ...smooth, handleOut: { x: 8, y: 2 } })).toBe(false);
        expect(pointType.equals(smooth, { ...smooth, y: 21 })).toBe(false);
    });
});
