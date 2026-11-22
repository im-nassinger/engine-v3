import { Component } from '../Component.ts';

import type { VariablesValues } from './VariablesValues.ts';
import { variablesSchema } from './variablesSchema.ts';

// Named values, such as `coins = 0` or `door_open = false`, each a name and its starting value. The World's
// are the level's; any other entity's are its own.
export class VariablesComponent extends Component<VariablesValues> {
    static readonly schema = variablesSchema;

    constructor(values: VariablesValues = variablesSchema.defaults()) {
        super(variablesSchema, values);
    }
}
