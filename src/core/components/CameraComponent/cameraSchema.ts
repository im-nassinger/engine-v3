import { ChoiceFieldType, EntityFieldType, NumberFieldType } from '../../fields/index.ts';

import { ComponentSchema } from '../ComponentSchema.ts';

import type { CameraMode, CameraValues } from './CameraValues.ts';

// v3's custom View size already allows this range, so v3 never refuses a saved level.
const viewSizeType = new NumberFieldType({ min: 160, max: 7680 });

export const cameraSchema = new ComponentSchema<CameraValues>({
    typeName: 'CameraComponent',
    cardOrder: 9,
    hasCard: true,
    // A level has exactly one camera, made with the level.
    addableByHand: false,
    fields: [
        {
            key: 'width',
            label: 'Width',
            type: viewSizeType,
            defaultValue: 1920,
            description: 'How wide an area players see, in pixels.',
            unit: 'px',
            // It is the area every player sees. Zoom in v3 is the way to change it.
            changeableInPlay: false,
        },
        {
            key: 'height',
            label: 'Height',
            type: viewSizeType,
            defaultValue: 1080,
            description: 'How tall an area players see, in pixels.',
            unit: 'px',
            changeableInPlay: false,
        },
        {
            key: 'follow',
            label: 'Follow',
            type: new EntityFieldType(),
            defaultValue: null,
            description: 'The entity the camera keeps in view during play. Empty stays where it is placed.',
            changeableInPlay: true,
        },
        {
            key: 'smoothing',
            label: 'Smoothing',
            type: new NumberFieldType({ min: 0, max: 5 }),
            defaultValue: 0.3,
            description: 'Roughly how long the camera takes to catch up, in seconds. 0 locks it to the target.',
            unit: 's',
            changeableInPlay: true,
        },
    ],
    storedValues: [
        {
            key: 'mode',
            type: new ChoiceFieldType<CameraMode>([{ value: 'fixedSize', label: 'Fixed size' }]),
            defaultValue: 'fixedSize',
        },
    ],
});
