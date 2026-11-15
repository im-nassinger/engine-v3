import { AngleFieldType, VectorFieldType } from '../../fields/index.ts';
import type { TransformValues } from '../../geometry/index.ts';

import { ComponentSchema } from '../schema/ComponentSchema.ts';

export const transformSchema = new ComponentSchema<TransformValues>({
    typeName: 'TransformComponent',
    cardOrder: 1,
    hasCard: true,
    addableByHand: false,
    fields: [
        {
            key: 'position',
            label: 'Position',
            type: new VectorFieldType(),
            defaultValue: { x: 0, y: 0 },
            description: 'Where the entity sits, in pixels, measured from its parent.',
            unit: 'px',
            changeableInPlay: true,
        },
        {
            key: 'rotation',
            label: 'Rotation',
            type: new AngleFieldType(),
            defaultValue: 0,
            description: 'How far the entity is turned clockwise, in degrees, measured from its parent.',
            unit: '°',
            changeableInPlay: true,
        },
        {
            key: 'scale',
            label: 'Scale',
            type: new VectorFieldType({ refuseZero: true }),
            defaultValue: { x: 1, y: 1 },
            description: "How much the entity is stretched across and down, measured from its parent. Can't be 0.",
            changeableInPlay: false,
        },
        {
            key: 'skew',
            label: 'Skew',
            type: new AngleFieldType({ min: -90, max: 90, refuseLimits: true }),
            defaultValue: 0,
            description: 'How far the entity is slanted, in degrees, measured from its parent. Between −90° and 90°.',
            unit: '°',
            changeableInPlay: false,
        },
    ],
});
