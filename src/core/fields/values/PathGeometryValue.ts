import type { PathGeometry, PathPoint } from '../../geometry/index.ts';

import { PathPointFieldType } from '../field-types/PathPointFieldType.ts';
import type { ParseOutcome } from '../ParseOutcome.ts';
import { accept, hasExactlyKeys, isPlainObject, refuse } from '../rawChecks.ts';
import type { ValueType } from '../ValueType.ts';

// An open path keeps at least 2 points, a closed one 3, as point editing says.
const MIN_OPEN_POINTS = 2;
const MIN_CLOSED_POINTS = 3;

const pointType = new PathPointFieldType();

// The PathComponent's stored path, saved as { closed, points: [{ x, y, handle_in, handle_out, corner }] }.
export class PathGeometryValue implements ValueType<PathGeometry> {
    parse(raw: unknown): ParseOutcome<PathGeometry> {
        if (!isPlainObject(raw)) return refuse({ reason: 'wrongType' });
        if (!hasExactlyKeys(raw, ['closed', 'points'])) return refuse({ reason: 'wrongType' });

        const closed = raw['closed'];
        if (typeof closed !== 'boolean') return refuse({ reason: 'wrongType' });

        const rawPoints = raw['points'];
        if (!Array.isArray(rawPoints)) return refuse({ reason: 'wrongType' });

        const minCount = closed ? MIN_CLOSED_POINTS : MIN_OPEN_POINTS;
        if (rawPoints.length < minCount) return refuse({ reason: 'tooFewPoints', minCount });

        const points: PathPoint[] = [];
        for (const rawPoint of rawPoints) {
            const parsed = pointType.parse(rawPoint);
            if (!parsed.ok) return parsed;

            points.push(parsed.value);
        }

        return accept({ closed, points });
    }

    serialize(value: PathGeometry) {
        const points = value.points.map((point) => pointType.serialize(point));

        return { closed: value.closed, points };
    }

    normalize(value: PathGeometry) {
        return value;
    }

    clone(value: PathGeometry): PathGeometry {
        const points = value.points.map((point) => pointType.clone(point));

        return { closed: value.closed, points };
    }

    equals(first: PathGeometry, second: PathGeometry) {
        if (first.closed !== second.closed) return false;
        if (first.points.length !== second.points.length) return false;

        return first.points.every((point, index) => {
            const other = second.points[index];
            return other !== undefined && pointType.equals(point, other);
        });
    }
}
