import type { Point, ShapeGeometry } from '../../geometry/index.ts';

import type { JsonValue } from '../JsonValue.ts';

import type { ParseOutcome } from '../ParseOutcome.ts';
import {
    accept,
    clamp,
    hasExactlyKeys,
    isPlainObject,
    parseFiniteNumber,
    parsePointList,
    pointsEqual,
    refuse,
} from '../rawChecks.ts';
import type { ValueType } from '../ValueType.ts';

// A rectangle is at least 1 px each side, and a circle at least 1 px across.
const MIN_SIDE = 1;
const MIN_RADIUS = MIN_SIDE / 2;
const MIN_POLYGON_POINTS = 3;
const MIN_LINE_POINTS = 2;

function parseSides(raw: Readonly<Record<string, unknown>>) {
    const parsedWidth = parseFiniteNumber(raw['width']);
    if (!parsedWidth.ok) return parsedWidth;

    const parsedHeight = parseFiniteNumber(raw['height']);
    if (!parsedHeight.ok) return parsedHeight;

    return accept({ width: parsedWidth.value, height: parsedHeight.value });
}

function copyPoints(points: readonly Point[]) {
    return points.map((point) => ({ x: point.x, y: point.y }));
}

// The ShapeComponent's stored geometry. The point limit (1,000) is the reader's, from LevelLimits.
export class ShapeGeometryValue implements ValueType<ShapeGeometry> {
    parse(raw: unknown): ParseOutcome<ShapeGeometry> {
        if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });

        const kind = raw['kind'];
        if (kind === 'rectangle') {
            if (!hasExactlyKeys(raw, ['kind', 'width', 'height'])) return refuse({ reason: 'wrongType' });

            const parsedSides = parseSides(raw);
            if (!parsedSides.ok) return parsedSides;

            return accept({ kind, ...parsedSides.value });
        }

        if (kind === 'circle') {
            if (!hasExactlyKeys(raw, ['kind', 'radius'])) return refuse({ reason: 'wrongType' });

            const parsedRadius = parseFiniteNumber(raw['radius']);
            if (!parsedRadius.ok) return parsedRadius;

            return accept({ kind, radius: parsedRadius.value });
        }

        if (kind === 'polygon' || kind === 'line') {
            if (!hasExactlyKeys(raw, ['kind', 'points'])) return refuse({ reason: 'wrongType' });

            const minCount = kind === 'polygon' ? MIN_POLYGON_POINTS : MIN_LINE_POINTS;
            const parsedPoints = parsePointList(raw['points'], minCount);
            if (!parsedPoints.ok) return parsedPoints;

            return accept({ kind, points: parsedPoints.value });
        }

        return refuse({ reason: 'unknownChoice' });
    }

    serialize(value: ShapeGeometry): JsonValue {
        if (value.kind === 'rectangle') {
            return { kind: value.kind, width: value.width, height: value.height };
        }

        if (value.kind === 'circle') return { kind: value.kind, radius: value.radius };

        return { kind: value.kind, points: copyPoints(value.points) };
    }

    normalize(value: ShapeGeometry): ShapeGeometry {
        if (value.kind === 'polygon' || value.kind === 'line') return value;

        if (value.kind === 'circle') {
            const radius = clamp(value.radius, MIN_RADIUS, Infinity);
            return { kind: value.kind, radius };
        }

        const width = clamp(value.width, MIN_SIDE, Infinity);
        const height = clamp(value.height, MIN_SIDE, Infinity);
        return { kind: value.kind, width, height };
    }

    clone(value: ShapeGeometry): ShapeGeometry {
        if (value.kind === 'rectangle' || value.kind === 'circle') return { ...value };

        return { kind: value.kind, points: copyPoints(value.points) };
    }

    equals(first: ShapeGeometry, second: ShapeGeometry) {
        switch (first.kind) {
            case 'rectangle':
                if (second.kind !== 'rectangle') return false;
                return first.width === second.width && first.height === second.height;
            case 'circle':
                if (second.kind !== 'circle') return false;
                return first.radius === second.radius;
            case 'polygon':
            case 'line':
                if (second.kind !== 'polygon' && second.kind !== 'line') return false;
                if (second.kind !== first.kind) return false;
                return pointsEqual(first.points, second.points);
        }
    }
}
