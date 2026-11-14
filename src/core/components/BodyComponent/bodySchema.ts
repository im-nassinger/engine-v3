import { CheckboxFieldType, ChoiceFieldType, NumberFieldType } from '../../fields/index.ts';

import { ComponentSchema } from '../ComponentSchema.ts';

import type { BodyType, BodyValues } from './BodyValues.ts';

function isDynamic(values: BodyValues) {
    return values.type === 'dynamic';
}

export const bodySchema = new ComponentSchema<BodyValues>({
    typeName: 'BodyComponent',
    cardOrder: 6,
    hasCard: true,
    addMenuSection: 'Physics',
    addableByHand: true,
    fields: [
        {
            key: 'type',
            label: 'Type',
            type: new ChoiceFieldType<BodyType>([
                { value: 'static', label: 'Static' },
                { value: 'dynamic', label: 'Dynamic' },
                { value: 'kinematic', label: 'Kinematic' },
            ]),
            defaultValue: 'dynamic',
            description: 'Static stays put, Dynamic falls and gets pushed, Kinematic moves only when told to.',
            changeableInPlay: true,
        },
        {
            key: 'gravityScale',
            label: 'Gravity scale',
            type: new NumberFieldType({ min: -10, max: 10 }),
            defaultValue: 1,
            description: 'How strongly gravity pulls. 1 is normal, 0 floats, negative rises.',
            changeableInPlay: true,
            appliesWhen: isDynamic,
        },
        {
            key: 'linearDamping',
            label: 'Linear damping',
            type: new NumberFieldType({ min: 0, max: 100 }),
            defaultValue: 0,
            description: 'Slows movement over time, even in mid-air. Use 2 to 5 for top-down games.',
            changeableInPlay: true,
            appliesWhen: isDynamic,
        },
        {
            key: 'angularDamping',
            label: 'Angular damping',
            type: new NumberFieldType({ min: 0, max: 100 }),
            defaultValue: 0,
            description: 'Slows spinning over time. Raise it to make balls stop rolling.',
            changeableInPlay: true,
            appliesWhen: isDynamic,
        },
        {
            key: 'fixedRotation',
            label: 'Fixed rotation',
            type: new CheckboxFieldType(),
            defaultValue: false,
            description: 'Never tips or spins. Use for players.',
            changeableInPlay: true,
            appliesWhen: isDynamic,
        },
        {
            key: 'bullet',
            label: 'Bullet',
            type: new CheckboxFieldType(),
            defaultValue: false,
            description: "Extra checks so a very fast entity doesn't pass through other moving things.",
            changeableInPlay: true,
            appliesWhen: isDynamic,
        },
        {
            key: 'merge',
            label: 'Merge',
            type: new CheckboxFieldType(),
            defaultValue: true,
            description: 'Inside a group with a body, joins that body. Untick to move by its own.',
            // Play builds the bodies once, at the start.
            changeableInPlay: false,
        },
    ],
    partners: [
        {
            partner: 'SurfaceComponent',
            onlyWith: 'ShapeComponent',
            noteText: 'Needs a SurfaceComponent to collide.',
        },
    ],
});
