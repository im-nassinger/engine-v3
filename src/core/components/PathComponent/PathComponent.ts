import { Component } from '../Component.ts';

import { pathSchema } from './pathSchema.ts';
import type { PathValues } from './PathValues.ts';

// A line made of points and curve handles. It draws, and never collides.
export class PathComponent extends Component<PathValues> {
    static readonly schema = pathSchema;

    constructor(values: PathValues = pathSchema.defaults()) {
        super(pathSchema, values);
    }
}
