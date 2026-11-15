import { convertShape } from '../../geometry/index.ts';
import type { Point, ShapeKind } from '../../geometry/index.ts';
import {
    ChoiceFieldType,
    ListFieldType,
    NumberFieldType,
    ShapeGeometryValue,
    VectorFieldType,
} from '../../fields/index.ts';

import { ComponentSchema } from '../schema/ComponentSchema.ts';
import { derivedField } from '../schema/DerivedFieldDefinition.ts';

import type { ShapeValues } from './ShapeValues.ts';
import { heightOf, radiusOf, resizedAlong, widthOf } from './shapeSize.ts';

const kindType = new ChoiceFieldType<ShapeKind>([
    { value: 'rectangle', label: 'Rectangle' },
    { value: 'circle', label: 'Circle' },
    { value: 'polygon', label: 'Polygon' },
    { value: 'line', label: 'Line' },
]);
// A rectangle is at least 1 px each side, and a typed size for a polygon or line too. A circle is at least
// 1 px across.
const sizeType = new NumberFieldType({ min: 1 });
const radiusType = new NumberFieldType({ min: 0.5 });
// A line needs 2 points and a polygon 3, which the write checks. 1,000 is LevelLimits' maxPoints.
const MIN_LINE_POINTS = 2;
const MIN_POLYGON_POINTS = 3;
const MAX_POINTS = 1_000;
const pointsType = new ListFieldType<Point>({
    itemType: new VectorFieldType(),
    minItems: MIN_LINE_POINTS,
    maxItems: MAX_POINTS,
});

function hasPoints(values: ShapeValues) {
    return values.geometry.kind === 'polygon' || values.geometry.kind === 'line';
}

function isCircle(values: ShapeValues) {
    return values.geometry.kind === 'circle';
}

function isNotCircle(values: ShapeValues) {
    return !isCircle(values);
}

export const shapeSchema = new ComponentSchema<ShapeValues>({
    typeName: 'ShapeComponent',
    cardOrder: 2,
    hasCard: true,
    addMenuSection: 'Drawing',
    addableByHand: true,
    fields: [],
    storedValues: [
        {
            key: 'geometry',
            type: new ShapeGeometryValue(),
            // What Add Component gives: the Shape tool always sets its own.
            defaultValue: { kind: 'rectangle', width: 100, height: 100 },
        },
    ],
    derivedFields: [
        derivedField<ShapeValues, ShapeKind>({
            key: 'kind',
            label: 'Kind',
            type: kindType,
            description: 'What the shape is. Changing it keeps its place and size.',
            read: (values) => values.geometry.kind,
            // Only the geometry: the edit that changes Kind also moves the TransformComponent by convertShape's
            // offset, which a component can't do for its partner.
            write: (values, kind) => {
                const converted = convertShape(values.geometry, kind);
                if (!converted.ok) {
                    const problem = { reason: 'tooFewPoints', minCount: converted.minPointCount } as const;
                    return { ok: false, problem };
                }

                return { ok: true, value: { geometry: converted.value.geometry } };
            },
        }),
        derivedField<ShapeValues, number>({
            key: 'width',
            label: 'Width',
            type: sizeType,
            description:
                'How wide the shape is, in pixels, before scale. On a polygon or line, typing moves the points.',
            unit: 'px',
            read: (values) => widthOf(values.geometry),
            write: (values, width) => {
                const resized = resizedAlong(values.geometry, 'x', width);
                if (!resized.ok) return resized;

                return { ok: true, value: { geometry: resized.value } };
            },
            appliesWhen: isNotCircle,
        }),
        derivedField<ShapeValues, number>({
            key: 'height',
            label: 'Height',
            type: sizeType,
            description:
                'How tall the shape is, in pixels, before scale. On a polygon or line, typing moves the points.',
            unit: 'px',
            read: (values) => heightOf(values.geometry),
            write: (values, height) => {
                const resized = resizedAlong(values.geometry, 'y', height);
                if (!resized.ok) return resized;

                return { ok: true, value: { geometry: resized.value } };
            },
            appliesWhen: isNotCircle,
        }),
        derivedField<ShapeValues, number>({
            key: 'radius',
            label: 'Radius',
            type: radiusType,
            description: 'How far the circle reaches from its middle, in pixels, before scale.',
            unit: 'px',
            read: (values) => radiusOf(values.geometry),
            write: (values, radius) => {
                // Radius is hidden on every other kind, so only a mistake in the code writes it there.
                if (!isCircle(values)) throw new Error('Only a circle has a Radius.');

                return { ok: true, value: { geometry: { kind: 'circle', radius } } };
            },
            appliesWhen: isCircle,
        }),
        derivedField<ShapeValues, Point[]>({
            key: 'points',
            label: 'Points',
            type: pointsType,
            description: "Its points, in pixels in the shape's own space. Double-click the shape to edit them.",
            unit: 'px',
            read: (values) => {
                if (values.geometry.kind === 'rectangle' || values.geometry.kind === 'circle') return [];

                return values.geometry.points.map((point) => ({ x: point.x, y: point.y }));
            },
            write: (values, points) => {
                const kind = values.geometry.kind;
                // Points is hidden on every other kind, so only a mistake in the code writes it there.
                if (kind !== 'polygon' && kind !== 'line') throw new Error('Only a polygon or line has Points.');

                const tooFewForPolygon = kind === 'polygon' && points.length < MIN_POLYGON_POINTS;
                if (tooFewForPolygon) {
                    const problem = { reason: 'tooFewItems', minCount: MIN_POLYGON_POINTS } as const;
                    return { ok: false, problem };
                }

                return { ok: true, value: { geometry: { kind, points } } };
            },
            appliesWhen: hasPoints,
        }),
    ],
});
