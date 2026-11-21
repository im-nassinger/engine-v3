import { describe, expect, test } from 'vitest';

import type { Fill } from '../fill/Fill.ts';
import { FillFieldType } from './FillFieldType.ts';

const BLUE = '#4A90D9FF';
const CLEAR_BLUE = '#4A90D900';
const RED = '#FF0000FF';

function linear(stops: unknown, start: unknown = { x: 0, y: 0.5 }, end: unknown = { x: 1, y: 0.5 }) {
    return { kind: 'linear', stops, start, end };
}

function radial(stops: unknown, radius: unknown = 0.5, centre: unknown = { x: 0.5, y: 0.5 }) {
    return { kind: 'radial', stops, centre, radius };
}

const twoStops = [
    { colour: BLUE, place: 0 },
    { colour: CLEAR_BLUE, place: 1 },
];

function stopsOfCount(count: number) {
    return Array.from({ length: count }, (_, index) => ({ colour: BLUE, place: index / Math.max(1, count - 1) }));
}

describe('FillFieldType', () => {
    const fieldType = new FillFieldType();
    const wrongType = { ok: false, problem: { reason: 'wrongType' } };

    test('its kind is fill, as v1 chose', () => {
        expect(fieldType.kind).toBe('fill');
    });

    test('parse accepts no fill and a solid colour, as v1 stored them', () => {
        expect(fieldType.parse({ kind: 'none' })).toEqual({ ok: true, value: { kind: 'none' } });
        expect(fieldType.parse({ kind: 'solid', colour: '#4a90d9ff' })).toEqual({
            ok: true,
            value: { kind: 'solid', colour: '#4a90d9ff' },
        });
    });

    test('parse accepts a linear and a radial gradient', () => {
        expect(fieldType.parse(linear(twoStops))).toEqual({ ok: true, value: linear(twoStops) });
        expect(fieldType.parse(radial(twoStops))).toEqual({ ok: true, value: radial(twoStops) });
    });

    test('parse accepts 2 and 8 stops, and positions a little past the box', () => {
        expect(fieldType.parse(linear(stopsOfCount(2))).ok).toBe(true);
        expect(fieldType.parse(linear(stopsOfCount(8))).ok).toBe(true);
        expect(fieldType.parse(linear(twoStops, { x: -10, y: 11 }, { x: 11, y: -10 })).ok).toBe(true);
        expect(fieldType.parse(radial(twoStops, 21)).ok).toBe(true);
    });

    test('parse refuses v1 shapes with other keys, and unknown kinds', () => {
        expect(fieldType.parse('#4A90D9FF')).toEqual(wrongType);
        expect(fieldType.parse({ kind: 'gradient' })).toEqual(wrongType);
        expect(fieldType.parse({ kind: 'none', colour: BLUE })).toEqual(wrongType);
        expect(fieldType.parse({ kind: 'solid' })).toEqual(wrongType);
        expect(fieldType.parse({ kind: 'solid', colour: 'blue' })).toEqual({
            ok: false,
            problem: { reason: 'badColour' },
        });
    });

    test('parse refuses 1 stop and more than 8', () => {
        expect(fieldType.parse(linear([]))).toEqual({ ok: false, problem: { reason: 'tooFewItems', minCount: 2 } });
        expect(fieldType.parse(linear(stopsOfCount(1)))).toEqual({
            ok: false,
            problem: { reason: 'tooFewItems', minCount: 2 },
        });
        expect(fieldType.parse(radial(stopsOfCount(9)))).toEqual({
            ok: false,
            problem: { reason: 'tooManyItems', maxCount: 8 },
        });
        expect(fieldType.parse(linear('stops'))).toEqual(wrongType);
    });

    test('parse refuses a place outside 0 to 1 and a bad stop', () => {
        const outside = { ok: false, problem: { reason: 'outsideLimits', min: 0, max: 1 } };

        expect(fieldType.parse(linear([{ colour: BLUE, place: -0.01 }, twoStops[1]]))).toEqual(outside);
        expect(fieldType.parse(linear([twoStops[0], { colour: BLUE, place: 1.01 }]))).toEqual(outside);
        expect(fieldType.parse(linear([twoStops[0], { colour: BLUE, place: Number.NaN }]))).toEqual({
            ok: false,
            problem: { reason: 'notFinite' },
        });
        expect(fieldType.parse(linear([twoStops[0], { colour: 'blue', place: 1 }]))).toEqual({
            ok: false,
            problem: { reason: 'badColour' },
        });
        expect(fieldType.parse(linear([twoStops[0], { colour: BLUE, place: 1, extra: 1 }]))).toEqual(wrongType);
    });

    test('parse refuses a radius of 0 or less, or past the farthest a handle can go', () => {
        const outside = { ok: false, problem: { reason: 'outsideLimits', min: 0, max: 21 } };

        expect(fieldType.parse(radial(twoStops, 0))).toEqual(outside);
        expect(fieldType.parse(radial(twoStops, -0.5))).toEqual(outside);
        expect(fieldType.parse(radial(twoStops, 21.5))).toEqual(outside);
        expect(fieldType.parse(radial(twoStops, '0.5'))).toEqual(wrongType);
    });

    test('parse refuses positions far outside the box, and missing or extra keys', () => {
        const outside = { ok: false, problem: { reason: 'outsideLimits', min: -10, max: 11 } };

        expect(fieldType.parse(linear(twoStops, { x: -10.5, y: 0 }))).toEqual(outside);
        expect(fieldType.parse(radial(twoStops, 0.5, { x: 0, y: 12 }))).toEqual(outside);
        expect(fieldType.parse(linear(twoStops, { x: 0 }))).toEqual(wrongType);
        expect(fieldType.parse({ kind: 'linear', stops: twoStops, start: { x: 0, y: 0 } })).toEqual(wrongType);
        expect(fieldType.parse({ ...radial(twoStops), start: { x: 0, y: 0 } })).toEqual(wrongType);
        expect(fieldType.parse({ ...linear(twoStops), radius: 0.5 })).toEqual(wrongType);
    });

    test('normalize sorts the stops by place, keeping the order of equal places, and uppercases colours', () => {
        const fill = linear([
            { colour: '#ff0000ff', place: 0.8 },
            { colour: '#00ff00ff', place: 0.2 },
            { colour: '#0000ffff', place: 0.5 },
            { colour: '#ffffffff', place: 0.2 },
        ]) as Fill;

        const normalized = fieldType.normalize(fill);

        expect(normalized).toEqual(
            linear([
                { colour: '#00FF00FF', place: 0.2 },
                { colour: '#FFFFFFFF', place: 0.2 },
                { colour: '#0000FFFF', place: 0.5 },
                { colour: '#FF0000FF', place: 0.8 },
            ]),
        );
    });

    test('a round trip keeps every kind, stored uppercase', () => {
        const fills = [
            { kind: 'none' },
            { kind: 'solid', colour: '#4a90d9ff' },
            linear(
                [
                    { colour: '#ff0000ff', place: 1 },
                    { colour: BLUE, place: 0 },
                ],
                { x: 0.1, y: 0.2 },
                { x: 0.9, y: 0.8 },
            ),
            radial(twoStops, 0.75, { x: 0.25, y: 0.5 }),
        ] as Fill[];

        for (const fill of fills) {
            const normalized = fieldType.normalize(fill);
            const saved = fieldType.serialize(normalized);

            expect(JSON.stringify(saved)).not.toMatch(/#[0-9A-F]*[a-f]/);
            expect(fieldType.parse(saved)).toEqual({ ok: true, value: normalized });
        }
    });

    test('serialize writes a linear gradient in the stored shape', () => {
        expect(fieldType.serialize(linear(twoStops) as Fill)).toEqual({
            kind: 'linear',
            stops: [
                { colour: BLUE, place: 0 },
                { colour: CLEAR_BLUE, place: 1 },
            ],
            start: { x: 0, y: 0.5 },
            end: { x: 1, y: 0.5 },
        });
    });

    test('clone shares nothing with the original', () => {
        const original = linear(twoStops) as Fill;
        const copy = fieldType.clone(original);

        expect(copy).toEqual(original);
        if (copy.kind !== 'linear' || original.kind !== 'linear') throw new Error('not linear');
        expect(copy.stops).not.toBe(original.stops);
        expect(copy.stops[0]).not.toBe(original.stops[0]);
        expect(copy.start).not.toBe(original.start);
    });

    test('equals compares the kind, the stops and the placement', () => {
        const blue = { kind: 'solid', colour: BLUE } as const;
        const line = linear(twoStops) as Fill;
        const circle = radial(twoStops) as Fill;

        expect(fieldType.equals(blue, { kind: 'solid', colour: BLUE })).toBe(true);
        expect(fieldType.equals(blue, { kind: 'solid', colour: RED })).toBe(false);
        expect(fieldType.equals(blue, { kind: 'none' })).toBe(false);
        expect(fieldType.equals({ kind: 'none' }, { kind: 'none' })).toBe(true);
        expect(fieldType.equals(line, linear(twoStops) as Fill)).toBe(true);
        expect(fieldType.equals(line, circle)).toBe(false);
        expect(fieldType.equals(line, linear(twoStops, { x: 0, y: 0 }) as Fill)).toBe(false);
        expect(fieldType.equals(line, linear([twoStops[0], { colour: RED, place: 1 }]) as Fill)).toBe(false);
        expect(fieldType.equals(line, linear(stopsOfCount(3)) as Fill)).toBe(false);
        expect(fieldType.equals(circle, radial(twoStops) as Fill)).toBe(true);
        expect(fieldType.equals(circle, radial(twoStops, 0.6) as Fill)).toBe(false);
    });
});
