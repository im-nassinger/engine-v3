import type { PathPoint } from '../../geometry/index.ts';
import { ListFieldType, PathGeometryValue, PathPointFieldType } from '../../fields/index.ts';

import { ComponentSchema } from '../schema/ComponentSchema.ts';
import { derivedField } from '../schema/DerivedFieldDefinition.ts';

import { pathWithPoints } from './pathPointsWrite.ts';
import type { PathValues } from './PathValues.ts';

// An open path needs 2 points and a closed one 3, which the write checks. 2,000 is LevelLimits' maxPathPoints.
const MIN_OPEN_POINTS = 2;
const MIN_CLOSED_POINTS = 3;
const MAX_POINTS = 2_000;
const pointsType = new ListFieldType<PathPoint>({
    itemType: new PathPointFieldType(),
    minItems: MIN_OPEN_POINTS,
    maxItems: MAX_POINTS,
});

export const pathSchema = new ComponentSchema<PathValues>({
    typeName: 'PathComponent',
    cardOrder: 3,
    hasCard: true,
    addMenuSection: 'Drawing',
    // A Rope or Spring has one, which the game keeps on the joint's ends, and v2's pen and Pencil draw them.
    addableByHand: false,
    fields: [],
    storedValues: [
        {
            key: 'path',
            type: new PathGeometryValue(),
            defaultValue: {
                closed: false,
                points: [
                    { x: 0, y: 0, handleIn: null, handleOut: null, corner: 'sharp' },
                    { x: 100, y: 0, handleIn: null, handleOut: null, corner: 'sharp' },
                ],
            },
        },
    ],
    derivedFields: [
        derivedField<PathValues, PathPoint[]>({
            key: 'points',
            label: 'Points',
            type: pointsType,
            // A Rope's or Spring's path is read-only in the Entity inspector: the joint keeps it on its ends.
            description: "Its points and their curve handles, in pixels in the path's own space.",
            unit: 'px',
            read: (values) => values.path.points.map((point) => pointsType.itemType.clone(point)),
            write: (values, points) => {
                const tooFewForClosed = values.path.closed && points.length < MIN_CLOSED_POINTS;
                if (tooFewForClosed) {
                    const problem = { reason: 'tooFewItems', minCount: MIN_CLOSED_POINTS } as const;
                    return { ok: false, problem };
                }

                return { ok: true, value: { path: pathWithPoints(values.path, points) } };
            },
        }),
    ],
});
