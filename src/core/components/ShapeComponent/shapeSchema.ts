import type { ShapeKind } from '../../geometry/index.ts';
import { ChoiceFieldType, NumberFieldType, ShapeGeometryValue } from '../../fields/index.ts';

import { ComponentSchema } from '../schema/ComponentSchema.ts';
import { derivedField } from '../schema/DerivedFieldDefinition.ts';

import type { ShapeValues } from './ShapeValues.ts';
import { heightOf, resizedAlong, widthOf } from './shapeSize.ts';

const kindType = new ChoiceFieldType<ShapeKind>([
    { value: 'rectangle', label: 'Rectangle' },
    { value: 'ellipse', label: 'Ellipse' },
    { value: 'polygon', label: 'Polygon' },
    { value: 'line', label: 'Line' },
]);
// A rectangle or ellipse is at least 1 px each side, and a typed size for a polygon or line too.
const sizeType = new NumberFieldType({ min: 1 });
const pointCountType = new NumberFieldType({ min: 0, wholeNumber: true });

function hasPoints(values: ShapeValues) {
    return values.geometry.kind === 'polygon' || values.geometry.kind === 'line';
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
            description: 'What the shape is. Set when it is drawn.',
            read: (values) => values.geometry.kind,
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
        }),
        derivedField<ShapeValues, number>({
            key: 'points',
            label: 'Points',
            type: pointCountType,
            description: 'How many points it has. Double-click the shape to edit them.',
            read: (values) => {
                if (values.geometry.kind === 'rectangle' || values.geometry.kind === 'ellipse') return 0;

                return values.geometry.points.length;
            },
            appliesWhen: hasPoints,
        }),
    ],
});
