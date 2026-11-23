import { TransformComponent } from '../../components/index.ts';
import type { LiveValue, ReadableValue } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';

import type { PlayRun } from '../run/PlayRun.ts';

import { placementNow } from './placementNow.ts';

const POSE_FIELDS: readonly string[] = ['position', 'rotation'];

// The number the component value check reads on an entity now: a number field of one of its components, one
// axis of a vector field, or, on a body, its speed or velocity in px/s from physics. A body's Position and
// Rotation are where physics has it now. Undefined when the entity doesn't have the value.
export function readableValueOf(entity: Entity, value: ReadableValue, run: PlayRun): number | undefined {
    if (value.kind === 'live') return liveValueOf(entity, value.live, run);

    const component = entity.components.find((held) => held.schema.typeName === value.component);
    if (component?.schema.findField(value.field) === undefined) return undefined;

    const held = fieldValueOf(entity, value.component, value.field, run) ?? component.readValue(value.field);
    if (value.axis === undefined) return typeof held === 'number' ? held : undefined;

    return isVector(held) ? held[value.axis] : undefined;
}

// A body's Position or Rotation as physics has it; undefined for every other field, read from the play copy.
function fieldValueOf(entity: Entity, component: string, field: string, run: PlayRun) {
    if (component !== TransformComponent.schema.typeName || !POSE_FIELDS.includes(field)) return undefined;

    const now = placementNow(entity, run);
    if (now === undefined) return undefined;

    return field === 'position' ? now.position : now.rotation;
}

// Not Math.hypot, which IEEE 754 doesn't define exactly, so it may differ between browsers.
function liveValueOf(entity: Entity, live: LiveValue, run: PlayRun) {
    const body = run.bodyMatrices.bodyOf(entity);
    if (body === undefined) return undefined;

    const { x, y } = run.scene.world.velocity(body.handle).linear;
    switch (live) {
        case 'speed':
            return Math.sqrt(x * x + y * y);
        case 'velocityX':
            return x;
        case 'velocityY':
            return y;
    }
}

function isVector(value: unknown): value is { readonly x: number; readonly y: number } {
    return typeof value === 'object' && value !== null && 'x' in value && 'y' in value;
}
