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
import { MAX_SHAPE_SIZE, MIN_SHAPE_SIZE, heightOf, radiusOf, resizedAlong, widthOf } from './shapeSize.ts';

const kindType = new ChoiceFieldType<ShapeKind>([
    { value: 'rectangle', label: 'Rectangle' },
    { value: 'circle', label: 'Circle' },
    { value: 'polygon', label: 'Polygon' },
    { value: 'line', label: 'Line' },
]);
// A typed size stops at MAX_SHAPE_SIZE, so the World's Width and Height fields can't make a level the
// reader refuses.
const sizeType = new NumberFieldType({ min: MIN_SHAPE_SIZE, max: MAX_SHAPE_SIZE });
const radiusType = new NumberFieldType({ min: MIN_SHAPE_SIZE / 2 });
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

// Only a rectangle has a Width and Height: a polygon or line is only its points (owner, 2026-11-16).
function isRectangle(values: ShapeValues) {
    return values.geometry.kind === 'rectangle';
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
            description: 'How wide the rectangle is, in pixels, before scale.',
            unit: 'px',
            read: (values) => widthOf(values.geometry),
            write: (values, width) => {
                // Width is hidden on every other kind, so only a mistake in the code writes it there.
                if (!isRectangle(values)) throw new Error('Only a rectangle has a Width.');

                const resized = resizedAlong(values.geometry, 'x', width);
                if (!resized.ok) return resized;

                return { ok: true, value: { geometry: resized.value } };
            },
            appliesWhen: isRectangle,
        }),
        derivedField<ShapeValues, number>({
            key: 'height',
            label: 'Height',
            type: sizeType,
            description: 'How tall the rectangle is, in pixels, before scale.',
            unit: 'px',
            read: (values) => heightOf(values.geometry),
            write: (values, height) => {
                // Height is hidden on every other kind, so only a mistake in the code writes it there.
                if (!isRectangle(values)) throw new Error('Only a rectangle has a Height.');

                const resized = resizedAlong(values.geometry, 'y', height);
                if (!resized.ok) return resized;

                return { ok: true, value: { geometry: resized.value } };
            },
            appliesWhen: isRectangle,
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
