import { Component } from '../Component.ts';

import { cameraSchema } from './cameraSchema.ts';
import type { CameraValues } from './CameraValues.ts';

// What the player sees: a box centred on the entity's position. A level has exactly one, inside the World.
export class CameraComponent extends Component<CameraValues> {
    static readonly schema = cameraSchema;

    constructor(values: CameraValues = cameraSchema.defaults()) {
        super(cameraSchema, values);
    }
}
