import { NumberFieldType, PathGeometryValue } from '../../fields/index.ts';

import { ComponentSchema } from '../ComponentSchema.ts';
import { derivedField } from '../DerivedFieldDefinition.ts';

import type { PathValues } from './PathValues.ts';

export const pathSchema = new ComponentSchema<PathValues>({
    typeName: 'PathComponent',
    cardOrder: 3,
    hasCard: true,
    addMenuSection: 'Drawing',
    // In v1 only a Rope or Spring has one, which the game keeps on the joint's ends. v2's pen draws paths.
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
        derivedField<PathValues, number>({
            key: 'points',
            label: 'Points',
            type: new NumberFieldType({ min: 0, wholeNumber: true }),
            description: 'How many points the path has. A rope or spring keeps them on its two ends.',
            read: (values) => values.path.points.length,
        }),
    ],
});
