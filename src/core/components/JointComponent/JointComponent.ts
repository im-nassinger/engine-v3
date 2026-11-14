import { Component } from '../Component.ts';

import { jointSchema } from './jointSchema.ts';
import type { JointValues } from './JointValues.ts';

// Connects two bodies. The joint is an ordinary entity; only the Joint tool makes one.
export class JointComponent extends Component<JointValues> {
    static readonly schema = jointSchema;

    constructor(values: JointValues = jointSchema.defaults()) {
        super(jointSchema, values);
    }
}
