import {
    BodyComponent,
    CameraComponent,
    JointComponent,
    NameComponent,
    PathComponent,
    PhysicsWorldComponent,
    ShapeComponent,
    StyleComponent,
    SurfaceComponent,
    TransformComponent,
} from '../../../core/components/index.ts';
import type { AnyComponent, AnyComponentSchema, ComponentClass } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';

import { AVAILABLE, unavailable } from '../model/Availability.ts';

// The reasons a component that can't be added by hand still shows in the menu, greyed. One that can't
// be added by hand and has no reason here, such as the PathComponent, isn't listed at all.
const NOT_BY_HAND_REASONS = new Map([[JointComponent.schema.typeName, 'Use the Joint tool to place a joint.']]);

const WORLD_CANT_COLLIDE =
    "The World can't collide. To block the edges of the level, turn on Walls on the PhysicsWorldComponent.";

// The components a level's World is made with. The ones added to it by hand, such as its variables, can be removed.
const WORLDS_OWN = [NameComponent, ShapeComponent, StyleComponent, PhysicsWorldComponent];

// What an entity is comes from its components, never from a kind field.
export function isWorld(entity: Entity) {
    return entity.hasComponent(PhysicsWorldComponent);
}

function isCamera(entity: Entity) {
    return entity.hasComponent(CameraComponent);
}

function isSchemaOf(schema: AnyComponentSchema, componentClass: ComponentClass<AnyComponent>) {
    return schema.typeName === componentClass.schema.typeName;
}

// undefined: never in the Add Component menu.
export function notByHandReason(schema: AnyComponentSchema) {
    return NOT_BY_HAND_REASONS.get(schema.typeName);
}

// Whether this entity may take the component by hand, for one that can be added by hand at all.
export function addAvailability(entity: Entity, schema: AnyComponentSchema) {
    const isBodyOrSurface = isSchemaOf(schema, BodyComponent) || isSchemaOf(schema, SurfaceComponent);
    if (isWorld(entity) && isBodyOrSurface) return unavailable(WORLD_CANT_COLLIDE);

    return AVAILABLE;
}

export function removeAvailability(entity: Entity, schema: AnyComponentSchema) {
    if (isSchemaOf(schema, TransformComponent)) return unavailable('Every entity has a TransformComponent');
    if (isSchemaOf(schema, JointComponent)) return unavailable('Delete the joint to remove it');

    const isCamerasOwn = isCamera(entity) && isSchemaOf(schema, CameraComponent);
    if (isCamerasOwn) return unavailable('The camera needs it');
    const isWorldsOwn = isWorld(entity) && WORLDS_OWN.some((componentClass) => isSchemaOf(schema, componentClass));
    if (isWorldsOwn) return unavailable('The World needs it');

    return AVAILABLE;
}

// Reset resets the fields only, so a card whose fields are all derived has nothing to reset.
export function resetAvailability(schema: AnyComponentSchema) {
    if (schema.fields.length === 0) return unavailable('Nothing to reset');

    return AVAILABLE;
}

// A field the Entity inspector shows read-only on this entity though it can be written elsewhere: the World's
// Kind, since its rectangle is the level bounds, and a Rope's or Spring's Points, since the joint rewrites
// its path every time an end moves.
export function isFixedOn(entity: Entity, schema: AnyComponentSchema, key: string) {
    const isKind = isSchemaOf(schema, ShapeComponent) && key === 'kind';
    if (isKind) return isWorld(entity);

    const isPathPoints = isSchemaOf(schema, PathComponent) && key === 'points';
    if (isPathPoints) return entity.hasComponent(JointComponent);

    return false;
}
