import type { Entity } from '../../level/index.ts';

import type { ValueChangeEffects } from './PlayValueWriter.ts';

// What actions set off that triggers hear in the same tick: a value change's effects, and a custom event
// fired on a target by `sender`, the entity whose trigger fired it.
export type ActionEffects = ValueChangeEffects & {
    customEventFired(target: Entity, name: string, sender: Entity): void;
};
