import { TagsFieldType } from '../../fields/index.ts';

import { ComponentSchema } from '../schema/ComponentSchema.ts';

import type { TagsValues } from './TagsValues.ts';

export const tagsSchema = new ComponentSchema<TagsValues>({
    typeName: 'TagsComponent',
    cardOrder: 11,
    hasCard: true,
    addMenuSection: 'Logic',
    addableByHand: true,
    fields: [
        {
            key: 'tags',
            label: 'Tags',
            type: new TagsFieldType(),
            defaultValue: [],
            description: 'Words such as player or coin that triggers look for. Type one and press Enter.',
            changeableInPlay: true,
        },
    ],
});
