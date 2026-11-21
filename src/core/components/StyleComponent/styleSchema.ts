import {
    CheckboxFieldType,
    ColourFieldType,
    DEFAULT_FILL_COLOUR,
    FillFieldType,
    NumberFieldType,
} from '../../fields/index.ts';

import { ComponentSchema } from '../schema/ComponentSchema.ts';

import type { StyleValues } from './StyleValues.ts';

// The one default look of v1's new shapes. The fill colour lives with the Fill, which switches on from it.
export { DEFAULT_FILL_COLOUR };
export const DEFAULT_OUTLINE_COLOUR = '#1F3552FF';

export const styleSchema = new ComponentSchema<StyleValues>({
    typeName: 'StyleComponent',
    cardOrder: 5,
    hasCard: true,
    addMenuSection: 'Drawing',
    addableByHand: true,
    fields: [
        {
            key: 'fill',
            label: 'Fill',
            type: new FillFieldType(),
            defaultValue: { kind: 'solid', colour: DEFAULT_FILL_COLOUR },
            description: 'The colour inside. Empty paints nothing.',
            changeableInPlay: true,
        },
        {
            key: 'outlineColour',
            label: 'Outline colour',
            type: new ColourFieldType(),
            defaultValue: DEFAULT_OUTLINE_COLOUR,
            description: 'The colour of the outline.',
            changeableInPlay: true,
        },
        {
            key: 'outlineWidth',
            label: 'Outline width',
            type: new NumberFieldType({ min: 0, max: 200 }),
            defaultValue: 2,
            description: 'How thick the outline is, in pixels. 0 means no outline.',
            unit: 'px',
            changeableInPlay: true,
        },
        {
            key: 'scaleOutline',
            label: 'Scale outline',
            type: new CheckboxFieldType(),
            // Off, so an uneven resize keeps the outline as wide as its width says (standing yes, 2026-11-17).
            // A level saved before the checkbox reads it as this default.
            defaultValue: false,
            description: "Stretches the outline with the entity's own scale. Off keeps it as wide as its width.",
            changeableInPlay: true,
        },
        {
            key: 'opacity',
            label: 'Opacity',
            type: new NumberFieldType({ min: 0, max: 1 }),
            defaultValue: 1,
            description: 'How see-through it is. 0% is invisible.',
            unit: '%',
            displayScale: 100,
            precision: 0,
            changeableInPlay: true,
        },
    ],
    partners: [
        {
            partner: 'ShapeComponent',
            alsoSatisfiedBy: ['PathComponent'],
            noteText: 'Needs a Shape to draw anything.',
        },
    ],
});
