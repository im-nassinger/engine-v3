import { ListFieldType, VariableFieldType } from '../../fields/index.ts';
import type { Variable } from '../../fields/index.ts';

import { ComponentSchema } from '../schema/ComponentSchema.ts';

import type { VariablesValues } from './VariablesValues.ts';

export const variablesSchema = new ComponentSchema<VariablesValues>({
    typeName: 'VariablesComponent',
    cardOrder: 12,
    hasCard: true,
    addMenuSection: 'Logic',
    // By hand on any entity: the World's are the level's, any other entity's are its own.
    addableByHand: true,
    fields: [
        {
            key: 'variables',
            label: 'Variables',
            type: new ListFieldType<Variable>({ itemType: new VariableFieldType(), itemName: (item) => item.name }),
            defaultValue: [],
            description:
                'Named values kept during play, such as coins: a number, a string or a boolean, each starting at its value.',
            // Each variable's value changes during play; the list itself doesn't.
            changeableInPlay: true,
        },
    ],
});
