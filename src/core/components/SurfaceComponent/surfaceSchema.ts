import { CheckboxFieldType, NumberFieldType } from '../../fields/index.ts';

import { ComponentSchema } from '../ComponentSchema.ts';

import type { SurfaceValues } from './SurfaceValues.ts';

export const surfaceSchema = new ComponentSchema<SurfaceValues>({
    typeName: 'SurfaceComponent',
    cardOrder: 7,
    hasCard: true,
    addMenuSection: 'Physics',
    addableByHand: true,
    fields: [
        {
            key: 'density',
            label: 'Density',
            type: new NumberFieldType({ min: 0, max: 100 }),
            defaultValue: 1,
            description: 'How heavy it is for its size. A 100 px square at density 1 weighs 4 kg.',
            changeableInPlay: false,
        },
        {
            key: 'friction',
            label: 'Friction',
            type: new NumberFieldType({ min: 0, max: 5 }),
            defaultValue: 0.3,
            description: 'How much it grips. 0 is ice, 1 is very grippy. Both surfaces count.',
            changeableInPlay: true,
        },
        {
            key: 'restitution',
            label: 'Restitution',
            type: new NumberFieldType({ min: 0, max: 2 }),
            defaultValue: 0,
            description: 'How much speed it keeps after a hit. 0 stops dead, 1 bounces back fully.',
            changeableInPlay: true,
        },
        {
            key: 'sensor',
            label: 'Sensor',
            type: new CheckboxFieldType(),
            defaultValue: false,
            description: 'Notices what touches it but never pushes.',
            changeableInPlay: true,
        },
    ],
    partners: [{ partner: 'ShapeComponent', noteText: 'Needs a ShapeComponent to collide.' }],
});
