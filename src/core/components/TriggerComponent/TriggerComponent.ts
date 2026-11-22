import { Component } from '../Component.ts';

import type { TriggerValues } from './TriggerValues.ts';
import { triggerSchema } from './triggerSchema.ts';

// An entity's triggers, each When, If, Do. Any entity can have one, the World included, which is the home
// of level-wide logic since it is never destroyed.
export class TriggerComponent extends Component<TriggerValues> {
    static readonly schema = triggerSchema;

    constructor(values: TriggerValues = triggerSchema.defaults()) {
        super(triggerSchema, values);
    }
}
