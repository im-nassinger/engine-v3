// A small component for tests of code that holds components, such as Entity and Level.
import { NumberFieldType } from '../../fields/index.ts';

import { Component } from '../Component.ts';
import { ComponentSchema } from '../ComponentSchema.ts';

type SpeedValues = { speed: number };

const speedSchema = new ComponentSchema<SpeedValues>({
    typeName: 'SpeedComponent',
    cardOrder: 1,
    hasCard: true,
    addableByHand: true,
    fields: [
        {
            key: 'speed',
            label: 'Speed',
            type: new NumberFieldType({ min: 0, max: 50 }),
            defaultValue: 5,
            description: 'How fast it goes.',
            changeableInPlay: true,
        },
    ],
});

export class SpeedComponent extends Component<SpeedValues> {
    static readonly schema = speedSchema;

    constructor(values: SpeedValues = speedSchema.defaults()) {
        super(speedSchema, values);
    }
}
