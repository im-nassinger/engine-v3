import { ListFieldType, VariableFieldType } from '../../fields/index.ts';
import type { Variable } from '../../fields/index.ts';

import { ComponentSchema } from '../schema/ComponentSchema.ts';

import type { VariablesValues } from './VariablesValues.ts';

export const variablesSchema = new ComponentSchema<VariablesValues>({
    typeName: 'VariablesComponent',
    cardOrder: 12,
    hasCard: true,
    addMenuSection: 'Logic',
    // By hand on the World only in v3: the Entity inspector's rule refuses it elsewhere, with the reason.
    addableByHand: true,
    fields: [
        {
            key: 'variables',
            label: 'Variables',
            type: new ListFieldType<Variable>({ itemType: new VariableFieldType(), itemName: (item) => item.name }),
            defaultValue: [],
            description: 'Named numbers the level keeps during play, such as coins. Each starts at its number.',
            // Each variable's value changes during play; the list itself doesn't.
            changeableInPlay: true,
        },
    ],
});
