import { AngleFieldType, CheckboxFieldType, ChoiceFieldType, NumberFieldType } from '../../fields/index.ts';

import { ComponentSchema } from '../schema/ComponentSchema.ts';

import type { GravityDirection, PhysicsWorldValues } from './PhysicsWorldValues.ts';

function isCustom(values: PhysicsWorldValues) {
    return values.gravityDirection === 'custom';
}

export const physicsWorldSchema = new ComponentSchema<PhysicsWorldValues>({
    typeName: 'PhysicsWorldComponent',
    // Only the World has it, after its ShapeComponent and StyleComponent.
    cardOrder: 10,
    hasCard: true,
    addableByHand: false,
    fields: [
        {
            key: 'gravityStrength',
            label: 'Gravity strength',
            type: new NumberFieldType({ min: 0, max: 100 }),
            defaultValue: 9.8,
            description: 'How hard everything falls, in m/s². 9.8 is Earth, 0 floats.',
            unit: 'm/s²',
            changeableInPlay: true,
        },
        {
            key: 'gravityDirection',
            label: 'Gravity direction',
            type: new ChoiceFieldType<GravityDirection>([
                { value: 'down', label: 'Down' },
                { value: 'up', label: 'Up' },
                { value: 'left', label: 'Left' },
                { value: 'right', label: 'Right' },
                { value: 'custom', label: 'Custom' },
            ]),
            defaultValue: 'down',
            description: 'Which way everything falls.',
            changeableInPlay: true,
        },
        {
            key: 'gravityAngle',
            label: 'Gravity angle',
            type: new AngleFieldType(),
            // 90° is down, so picking Custom never flips gravity by surprise.
            defaultValue: 90,
            description: 'Which way everything falls, in degrees clockwise from the right. 90° is down.',
            unit: '°',
            changeableInPlay: true,
            appliesWhen: isCustom,
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
