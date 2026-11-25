import { CheckboxFieldType, NumberFieldType, VectorFieldType } from '../../fields/index.ts';

import { ComponentSchema } from '../schema/ComponentSchema.ts';

import type { PhysicsWorldValues } from './PhysicsWorldValues.ts';

// 1 m is 100 px unless the World says otherwise (owner, 2026-11-25).
export const DEFAULT_PIXELS_PER_METRE = 100;

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
        {
            key: 'pixelsPerMetre',
            label: 'Pixels per metre',
            // 1 to 1,000 keeps a 1 px line and a 1,000 m level inside Box2D's sizes (standing yes, 2026-11-25).
            type: new NumberFieldType({ min: 1, max: 1000 }),
            defaultValue: DEFAULT_PIXELS_PER_METRE,
            description: 'How many level pixels make 1 metre for the physics. Changing it keeps the level as drawn.',
            unit: 'px/m',
            // Box2D's world is built at one scale when play starts.
            changeableInPlay: false,
        },
    ],
});
