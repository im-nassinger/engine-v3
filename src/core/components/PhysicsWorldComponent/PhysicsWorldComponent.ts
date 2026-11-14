import { Component } from '../Component.ts';

import { physicsWorldSchema } from './physicsWorldSchema.ts';
import type { PhysicsWorldValues } from './PhysicsWorldValues.ts';

// The level-wide physics settings. Only the World has it.
export class PhysicsWorldComponent extends Component<PhysicsWorldValues> {
    static readonly schema = physicsWorldSchema;

    constructor(values: PhysicsWorldValues = physicsWorldSchema.defaults()) {
        super(physicsWorldSchema, values);
    }
}
