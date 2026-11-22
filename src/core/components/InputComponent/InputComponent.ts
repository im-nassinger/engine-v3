import { Component } from '../Component.ts';

import type { InputValues } from './InputValues.ts';
import { inputSchema } from './inputSchema.ts';

// The level's inputs, each a name and its keys, such as `jump` on Space. The World's only; a new one
// holds the five a new level starts with.
export class InputComponent extends Component<InputValues> {
    static readonly schema = inputSchema;

    constructor(values: InputValues = inputSchema.defaults()) {
        super(inputSchema, values);
    }
}
