import {
    AngleFieldType,
    CheckboxFieldType,
    ChoiceFieldType,
    EntityFieldType,
    JointEndsValue,
    NumberFieldType,
} from '../../fields/index.ts';

import { ComponentSchema } from '../schema/ComponentSchema.ts';

import type { JointType, JointValues } from './JointValues.ts';

// What a file without Length or Rest length reads. The Joint tool always sets them from the drawn gap.
const MISSING_LENGTH = 100;
const lengthType = new NumberFieldType({ min: 1, max: 100_000 });

function isHinge(values: JointValues) {
    return values.type === 'hinge';
}

function hasLimits(values: JointValues) {
    return isHinge(values) && values.limitRotation;
}

function hasMotor(values: JointValues) {
    return isHinge(values) && values.motor;
}

function isTwoEnded(values: JointValues) {
    return values.type === 'rope' || values.type === 'spring';
}

function hasTypedLength(values: JointValues) {
    return values.type === 'rope' && !values.matchDrawnDistance;
}

function hasTypedRestLength(values: JointValues) {
    return values.type === 'spring' && !values.matchDrawnDistance;
}

function isSpring(values: JointValues) {
    return values.type === 'spring';
}

export const jointSchema = new ComponentSchema<JointValues>({
    typeName: 'JointComponent',
    cardOrder: 8,
    hasCard: true,
    addMenuSection: 'Physics',
    // Only the Joint tool makes joints: added by hand, a joint would have no ends and no A.
    addableByHand: false,
    fields: [
        {
            key: 'type',
            label: 'Type',
            type: new ChoiceFieldType<JointType>([
                { value: 'hinge', label: 'Hinge' },
                { value: 'rope', label: 'Rope' },
                { value: 'spring', label: 'Spring' },
            ]),
            defaultValue: 'hinge',
            description:
                'Hinge turns around one point, Rope keeps a longest distance, Spring pulls back to a rest length.',
            changeableInPlay: false,
        },
        {
            key: 'a',
            label: 'A',
            type: new EntityFieldType(),
            defaultValue: null,
            description: 'The first entity it connects.',
            changeableInPlay: false,
        },
        {
            key: 'b',
            label: 'B',
            type: new EntityFieldType(),
            defaultValue: null,
            description: 'The second entity. Empty pins A to the background.',
            changeableInPlay: false,
        },
        {
            key: 'letConnectedObjectsCollide',
            label: 'Let connected objects collide',
            type: new CheckboxFieldType(),
            // Off for a Hinge. The Joint tool turns it on for a Rope or Spring, whose ends act at a distance.
            defaultValue: false,
            description: 'Lets the two bodies bump into each other.',
            changeableInPlay: false,
        },
        {
            key: 'limitRotation',
            label: 'Limit rotation',
            type: new CheckboxFieldType(),
            defaultValue: false,
            description: 'Stops A turning too far.',
            changeableInPlay: true,
            appliesWhen: isHinge,
        },
        {
            key: 'minAngle',
            label: 'Min angle',
            // Limits always include the placed position, so Min can't go above 0.
            type: new AngleFieldType({ min: -180, max: 0 }),
            defaultValue: -45,
            description: 'How far it can turn anticlockwise from how it is placed.',
            unit: '°',
            changeableInPlay: true,
            appliesWhen: hasLimits,
        },
        {
            key: 'maxAngle',
            label: 'Max angle',
            type: new AngleFieldType({ min: 0, max: 180 }),
            defaultValue: 45,
            description: 'How far it can turn clockwise from how it is placed.',
            unit: '°',
            changeableInPlay: true,
            appliesWhen: hasLimits,
        },
        {
            key: 'motor',
            label: 'Motor',
            type: new CheckboxFieldType(),
            defaultValue: false,
            description: 'Turns A by itself.',
            changeableInPlay: true,
            appliesWhen: isHinge,
        },
        {
            key: 'motorSpeed',
            label: 'Motor speed',
            type: new NumberFieldType({ min: -2_700, max: 2_700 }),
            defaultValue: 180,
            description: 'The speed the motor aims for, in °/s.',
            unit: '°/s',
            changeableInPlay: true,
            appliesWhen: hasMotor,
        },
        {
            key: 'motorStrength',
            label: 'Motor strength',
            type: new NumberFieldType({ min: 0, max: 100_000 }),
            defaultValue: 50,
            description: 'How hard it pushes. Too low and it never reaches speed.',
            changeableInPlay: true,
            appliesWhen: hasMotor,
        },
        {
            key: 'resistance',
            label: 'Resistance',
            type: new NumberFieldType({ min: 0, max: 100_000 }),
            defaultValue: 0,
            description: 'Stiffness in the joint, so limbs and doors slow and settle.',
            changeableInPlay: true,
            appliesWhen: isHinge,
        },
        {
            key: 'matchDrawnDistance',
            label: 'Match drawn distance',
            type: new CheckboxFieldType(),
            defaultValue: true,
            description: 'Keeps the length equal to the gap between the two ends.',
            changeableInPlay: false,
            appliesWhen: isTwoEnded,
        },
        {
            key: 'length',
            label: 'Length',
            type: lengthType,
            defaultValue: MISSING_LENGTH,
            description: 'The longest the rope can get. Longer than the gap gives slack.',
            unit: 'px',
            changeableInPlay: true,
            appliesWhen: hasTypedLength,
        },
        {
            key: 'restLength',
            label: 'Rest length',
            type: lengthType,
            defaultValue: MISSING_LENGTH,
            description: 'The length the spring pulls back to.',
            unit: 'px',
            changeableInPlay: true,
            appliesWhen: hasTypedRestLength,
        },
        {
            key: 'stiffness',
            label: 'Stiffness',
            type: new NumberFieldType({ min: 0.1, max: 15 }),
            defaultValue: 2,
            description: 'Bounces per second. Higher is firmer.',
            changeableInPlay: true,
            appliesWhen: isSpring,
        },
        {
            key: 'damping',
            label: 'Damping',
            type: new NumberFieldType({ min: 0, max: 1 }),
            defaultValue: 0.3,
            description: 'How fast the bouncing dies out. 0 keeps bouncing, 1 settles at once.',
            changeableInPlay: true,
            appliesWhen: isSpring,
        },
    ],
    storedValues: [
        {
            key: 'ends',
            type: new JointEndsValue(),
            defaultValue: { a: { x: 0, y: 0 }, b: { x: 0, y: 0 } },
        },
    ],
});
