import { TextFieldType } from '../../fields/index.ts';

import { ComponentSchema } from '../ComponentSchema.ts';

import type { NameValues } from './NameValues.ts';

export const nameSchema = new ComponentSchema<NameValues>({
    typeName: 'NameComponent',
    cardOrder: 0,
    // The Inspector's header edits the name.
    hasCard: false,
    addableByHand: false,
    fields: [
        {
            key: 'name',
            label: 'Name',
            type: new TextFieldType({ minLength: 1, maxLength: 64, trimmed: true }),
            // Only a file without a name reaches it: every way of making an entity names it.
            defaultValue: 'Entity',
            description: "The entity's name. It doesn't have to be unique.",
            changeableInPlay: false,
        },
    ],
});
