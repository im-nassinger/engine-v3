import { ListFieldType, NumberFieldType, TriggerFieldType } from '../../fields/index.ts';
import type { Trigger } from '../../fields/index.ts';

import { ComponentSchema } from '../schema/ComponentSchema.ts';

import type { TriggerValues } from './TriggerValues.ts';

export const triggerSchema = new ComponentSchema<TriggerValues>({
    typeName: 'TriggerComponent',
    cardOrder: 15,
    hasCard: true,
    addMenuSection: 'Logic',
    addableByHand: true,
    fields: [
        {
            key: 'triggers',
            label: 'Triggers',
            type: new ListFieldType<Trigger>({ itemType: new TriggerFieldType(), itemId: (item) => item.id }),
            defaultValue: [],
            description: 'When something happens, if the checks are true, do the actions, top to bottom.',
            // Each trigger's on/off changes during play; the rest of a trigger doesn't.
            changeableInPlay: true,
        },
    ],
    storedValues: [
        {
            key: 'nextTriggerId',
            type: new NumberFieldType({ min: 1, wholeNumber: true }),
            defaultValue: 1,
        },
    ],
});
