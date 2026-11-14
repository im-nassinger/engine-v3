import { Component } from '../Component.ts';

import { styleSchema } from './styleSchema.ts';
import type { StyleValues } from './StyleValues.ts';

// How a shape or path looks: fill, outline and opacity. Without one, it is invisible in play.
export class StyleComponent extends Component<StyleValues> {
    static readonly schema = styleSchema;

    constructor(values: StyleValues = styleSchema.defaults()) {
        super(styleSchema, values);
    }
}
