import { Component } from '../Component.ts';

import { shapeSchema } from './shapeSchema.ts';
import type { ShapeValues } from './ShapeValues.ts';

// A rectangle, ellipse, polygon or line, in the entity's own space. What draws and what collides.
export class ShapeComponent extends Component<ShapeValues> {
    static readonly schema = shapeSchema;

    constructor(values: ShapeValues = shapeSchema.defaults()) {
        super(shapeSchema, values);
    }
}
