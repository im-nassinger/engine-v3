import { CheckboxFieldType, VectorFieldType } from '../../fields/index.ts';

import { ComponentSchema } from '../schema/ComponentSchema.ts';

import type { PhysicsWorldValues } from './PhysicsWorldValues.ts';

export const physicsWorldSchema = new ComponentSchema<PhysicsWorldValues>({
    typeName: 'PhysicsWorldComponent',
    // Only the World has it, after its ShapeComponent and StyleComponent.
    cardOrder: 10,
    hasCard: true,
    addableByHand: false,
    fields: [
        {
            key: 'gravity',
            label: 'Gravity',
            // The old strength's limit of 100, per axis.
            type: new VectorFieldType({ min: -100, max: 100 }),
            // Straight down, since y points down.
            defaultValue: { x: 0, y: 9.8 },
            description: 'Which way and how hard everything falls, in m/s². 0, 9.8 is Earth, 0, 0 floats.',
            unit: 'm/s²',
            changeableInPlay: true,
        },
        {
            key: 'walls',
            label: 'Walls',
            type: new CheckboxFieldType(),
            defaultValue: false,
            description: 'Makes all four edges of the level bounds walls. Off, entities that leave are removed.',
            // The bounds don't change during play.
            changeableInPlay: false,
        },
    ],
});
