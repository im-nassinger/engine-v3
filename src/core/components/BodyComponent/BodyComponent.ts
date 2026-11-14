import { Component } from '../Component.ts';

import { bodySchema } from './bodySchema.ts';
import type { BodyValues } from './BodyValues.ts';

// How the entity moves in play. Its Mass is a read-only row the Inspector adds, worked out from the shapes.
export class BodyComponent extends Component<BodyValues> {
    static readonly schema = bodySchema;

    constructor(values: BodyValues = bodySchema.defaults()) {
        super(bodySchema, values);
    }
}
