import type { TransformValues } from '../../geometry/index.ts';

import { Component } from '../Component.ts';

import { transformSchema } from './transformSchema.ts';

// Where an entity sits, measured from its parent. The values are geometry's TransformValues, which Matrix2D reads.
export class TransformComponent extends Component<TransformValues> {
    static readonly schema = transformSchema;

    constructor(values: TransformValues = transformSchema.defaults()) {
        super(transformSchema, values);
    }
}
