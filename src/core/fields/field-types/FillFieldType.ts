import type { Point } from '../../geometry/index.ts';

import { ColourFieldType } from './ColourFieldType.ts';
import type { FieldType } from '../FieldType.ts';
import type { ColourStop, Fill } from '../fill/Fill.ts';
import { MAX_POSITION, MAX_RADIUS, MAX_STOPS, MIN_POSITION, MIN_STOPS } from '../fill/Fill.ts';
import type { JsonValue } from '../JsonValue.ts';
import type { ParseOutcome } from '../ParseOutcome.ts';
import { accept, hasExactlyKeys, isPlainObject, parseFiniteNumber, parsePoint, refuse } from '../rawChecks.ts';

const colourType = new ColourFieldType();

function parseLimited(raw: unknown, min: number, max: number): ParseOutcome<number> {
    const parsed = parseFiniteNumber(raw);
    if (!parsed.ok) return parsed;
    if (parsed.value < min || parsed.value > max) return refuse({ reason: 'outsideLimits', min, max });

    return parsed;
}

function parsePosition(raw: unknown): ParseOutcome<Point> {
    const parsed = parsePoint(raw);
    if (!parsed.ok) return parsed;

    const parsedX = parseLimited(parsed.value.x, MIN_POSITION, MAX_POSITION);
    if (!parsedX.ok) return parsedX;

    const parsedY = parseLimited(parsed.value.y, MIN_POSITION, MAX_POSITION);
    if (!parsedY.ok) return parsedY;

    return parsed;
}

function parseStop(raw: unknown): ParseOutcome<ColourStop> {
    if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });
    if (!hasExactlyKeys(raw, ['colour', 'place'])) return refuse({ reason: 'wrongType' });

    const parsedColour = colourType.parse(raw['colour']);
    if (!parsedColour.ok) return parsedColour;

    const parsedPlace = parseLimited(raw['place'], 0, 1);
    if (!parsedPlace.ok) return parsedPlace;

    return accept({ colour: parsedColour.value, place: parsedPlace.value });
}

function parseStops(raw: unknown): ParseOutcome<ColourStop[]> {
    if (!Array.isArray(raw)) return refuse({ reason: 'wrongType' });
    if (raw.length < MIN_STOPS) return refuse({ reason: 'tooFewItems', minCount: MIN_STOPS });
    if (raw.length > MAX_STOPS) return refuse({ reason: 'tooManyItems', maxCount: MAX_STOPS });

    const stops: ColourStop[] = [];
    for (const rawStop of raw) {
        const parsed = parseStop(rawStop);
        if (!parsed.ok) return parsed;

        stops.push(parsed.value);
    }

    return accept(stops);
}

function parseSolid(raw: Readonly<Record<string, unknown>>): ParseOutcome<Fill> {
    if (!hasExactlyKeys(raw, ['kind', 'colour'])) return refuse({ reason: 'wrongType' });

    const parsedColour = colourType.parse(raw['colour']);
    if (!parsedColour.ok) return parsedColour;

    return accept({ kind: 'solid', colour: parsedColour.value });
}

function parseLinear(raw: Readonly<Record<string, unknown>>): ParseOutcome<Fill> {
    if (!hasExactlyKeys(raw, ['kind', 'stops', 'start', 'end'])) return refuse({ reason: 'wrongType' });

    const parsedStops = parseStops(raw['stops']);
    if (!parsedStops.ok) return parsedStops;

    const parsedStart = parsePosition(raw['start']);
    if (!parsedStart.ok) return parsedStart;

    const parsedEnd = parsePosition(raw['end']);
    if (!parsedEnd.ok) return parsedEnd;

    return accept({ kind: 'linear', stops: parsedStops.value, start: parsedStart.value, end: parsedEnd.value });
}

function parseRadial(raw: Readonly<Record<string, unknown>>): ParseOutcome<Fill> {
    if (!hasExactlyKeys(raw, ['kind', 'stops', 'centre', 'radius'])) return refuse({ reason: 'wrongType' });

    const parsedStops = parseStops(raw['stops']);
    if (!parsedStops.ok) return parsedStops;

    const parsedCentre = parsePosition(raw['centre']);
    if (!parsedCentre.ok) return parsedCentre;

    const parsedRadius = parseFiniteNumber(raw['radius']);
    if (!parsedRadius.ok) return parsedRadius;

    const radius = parsedRadius.value;
    if (radius <= 0 || radius > MAX_RADIUS) return refuse({ reason: 'outsideLimits', min: 0, max: MAX_RADIUS });

    return accept({ kind: 'radial', stops: parsedStops.value, centre: parsedCentre.value, radius });
}

function normalizeStops(stops: readonly ColourStop[]) {
    const uppercased = stops.map((stop) => ({ colour: colourType.normalize(stop.colour), place: stop.place }));

    // The sort is stable, so stops at the same place keep their order.
    return uppercased.sort((first, second) => first.place - second.place);
}

function stopsEqual(first: readonly ColourStop[], second: readonly ColourStop[]) {
    if (first.length !== second.length) return false;

    return first.every((stop, index) => {
        const other = second[index];
        return other !== undefined && stop.colour === other.colour && stop.place === other.place;
    });
}

function samePoint(first: Point, second: Point) {
    return first.x === second.x && first.y === second.y;
}

function stopsJson(stops: readonly ColourStop[]): JsonValue {
    return stops.map((stop) => ({ colour: stop.colour, place: stop.place }));
}

// Nothing, a solid colour, or a linear or radial gradient of 2 to 8 stops. Its kind 'fill' is v1's.
export class FillFieldType implements FieldType<Fill> {
    readonly kind = 'fill';

    parse(raw: unknown): ParseOutcome<Fill> {
        if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });

        switch (raw['kind']) {
            case 'none':
                return hasExactlyKeys(raw, ['kind']) ? accept({ kind: 'none' }) : refuse({ reason: 'wrongType' });
            case 'solid':
                return parseSolid(raw);
            case 'linear':
                return parseLinear(raw);
            case 'radial':
                return parseRadial(raw);
            default:
                return refuse({ reason: 'wrongType' });
        }
    }

    serialize(value: Fill): JsonValue {
        switch (value.kind) {
            case 'none':
                return { kind: 'none' };
            case 'solid':
                return { kind: 'solid', colour: value.colour };
            case 'linear':
                return {
                    kind: 'linear',
                    stops: stopsJson(value.stops),
                    start: { x: value.start.x, y: value.start.y },
                    end: { x: value.end.x, y: value.end.y },
                };
            case 'radial':
                return {
                    kind: 'radial',
                    stops: stopsJson(value.stops),
                    centre: { x: value.centre.x, y: value.centre.y },
                    radius: value.radius,
                };
        }
    }

    normalize(value: Fill): Fill {
        switch (value.kind) {
            case 'none':
                return value;
            case 'solid':
                return { kind: 'solid', colour: colourType.normalize(value.colour) };
            case 'linear':
            case 'radial':
                return { ...value, stops: normalizeStops(value.stops) };
        }
    }

    clone(value: Fill): Fill {
        switch (value.kind) {
            case 'none':
            case 'solid':
                return { ...value };
            case 'linear':
                return {
                    ...value,
                    stops: value.stops.map((stop) => ({ ...stop })),
                    start: { ...value.start },
                    end: { ...value.end },
                };
            case 'radial':
                return { ...value, stops: value.stops.map((stop) => ({ ...stop })), centre: { ...value.centre } };
        }
    }

    equals(first: Fill, second: Fill) {
        switch (first.kind) {
            case 'none':
                return second.kind === 'none';
            case 'solid':
                return second.kind === 'solid' && first.colour === second.colour;
            case 'linear':
                return (
                    second.kind === 'linear' &&
                    stopsEqual(first.stops, second.stops) &&
                    samePoint(first.start, second.start) &&
                    samePoint(first.end, second.end)
                );
            case 'radial':
                return (
                    second.kind === 'radial' &&
                    stopsEqual(first.stops, second.stops) &&
                    samePoint(first.centre, second.centre) &&
                    first.radius === second.radius
                );
        }
    }
}
