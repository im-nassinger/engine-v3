import { Component } from '../Component.ts';

import { surfaceSchema } from './surfaceSchema.ts';
import type { SurfaceValues } from './SurfaceValues.ts';

// Makes the entity's shape collide. Without a body on it or above it, it acts as Static.
export class SurfaceComponent extends Component<SurfaceValues> {
    static readonly schema = surfaceSchema;

    constructor(values: SurfaceValues = surfaceSchema.defaults()) {
        super(surfaceSchema, values);
    }
}
