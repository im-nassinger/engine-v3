import { Component } from '../Component.ts';

import type { VariablesValues } from './VariablesValues.ts';
import { variablesSchema } from './variablesSchema.ts';

// The level's variables, such as `coins = 0`, each a name and its starting number. Only the World has
// one in v3; any entity can from v4.
export class VariablesComponent extends Component<VariablesValues> {
    static readonly schema = variablesSchema;

    constructor(values: VariablesValues = variablesSchema.defaults()) {
        super(variablesSchema, values);
    }
}
