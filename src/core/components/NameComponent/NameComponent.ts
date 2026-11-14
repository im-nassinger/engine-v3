import { Component } from '../Component.ts';

import type { NameValues } from './NameValues.ts';
import { nameSchema } from './nameSchema.ts';

export class NameComponent extends Component<NameValues> {
    static readonly schema = nameSchema;

    constructor(values: NameValues = nameSchema.defaults()) {
        super(nameSchema, values);
    }
}
