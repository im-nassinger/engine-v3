// A small component for tests of code that holds components, such as Entity and Level.
import { NumberFieldType } from '../../fields/index.ts';

import { Component } from '../Component.ts';
import { ComponentSchema } from '../schema/ComponentSchema.ts';

type WeightValues = { weight: number };

const weightSchema = new ComponentSchema<WeightValues>({
    typeName: 'WeightComponent',
    cardOrder: 2,
    hasCard: true,
    addableByHand: true,
    fields: [
        {
            key: 'weight',
            label: 'Weight',
            type: new NumberFieldType({ min: 0, max: 100 }),
            defaultValue: 10,
            description: 'How heavy it is.',
            changeableInPlay: true,
        },
    ],
});

export class WeightComponent extends Component<WeightValues> {
    static readonly schema = weightSchema;

    constructor(values: WeightValues = weightSchema.defaults()) {
        super(weightSchema, values);
    }
}
