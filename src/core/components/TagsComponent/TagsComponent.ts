import { Component } from '../Component.ts';

import type { TagsValues } from './TagsValues.ts';
import { tagsSchema } from './tagsSchema.ts';

// The entity's tags, such as `player` or `coin`, that triggers look for. Any entity can have one.
export class TagsComponent extends Component<TagsValues> {
    static readonly schema = tagsSchema;

    constructor(values: TagsValues = tagsSchema.defaults()) {
        super(tagsSchema, values);
    }
}
