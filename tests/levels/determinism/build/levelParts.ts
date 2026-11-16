import {
    BodyComponent,
    NameComponent,
    PhysicsWorldComponent,
    ShapeComponent,
    SurfaceComponent,
    TransformComponent,
} from '../../../../src/core/components/index.ts';
import type { BodyValues, SurfaceValues } from '../../../../src/core/components/index.ts';
import type { Point, ShapeGeometry, TransformValues } from '../../../../src/core/geometry/index.ts';
import type { Entity, Level } from '../../../../src/core/level/index.ts';

const NO_TRANSFORM: TransformValues = { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 };

// A named entity at the end of its parent's list, so the Entities panel order is the order built.
export function addEntity(level: Level, parent: Entity, name: string, transform: Partial<TransformValues> = {}) {
    const entity = level.createEntity(parent, parent.children.length);
    entity.addComponent(new TransformComponent({ ...NO_TRANSFORM, ...transform }));
    entity.addComponent(new NameComponent({ name }));

    return entity;
}

export function at(x: number, y: number): Partial<TransformValues> {
    return { position: { x, y } };
}

// A shape with a surface, which collides; with no body of its own it merges up or is Static.
export function addSurface(entity: Entity, geometry: ShapeGeometry, surface: Partial<SurfaceValues> = {}) {
    entity.addComponent(new ShapeComponent({ geometry }));
    entity.addComponent(new SurfaceComponent({ ...SurfaceComponent.schema.defaults(), ...surface }));

    return entity;
}

export function addBody(entity: Entity, body: Partial<BodyValues> = {}) {
    entity.addComponent(new BodyComponent({ ...BodyComponent.schema.defaults(), ...body }));

    return entity;
}

export function rectangle(width: number, height: number): ShapeGeometry {
    return { kind: 'rectangle', width, height };
}

export function circle(radius: number): ShapeGeometry {
    return { kind: 'circle', radius };
}

export function polygon(points: readonly Point[]): ShapeGeometry {
    return { kind: 'polygon', points };
}

export function line(points: readonly Point[]): ShapeGeometry {
    return { kind: 'line', points };
}

// The level bounds as a rectangle centred on the World's origin, with Walls on or off.
export function setBounds(level: Level, width: number, height: number, walls: boolean) {
    level.world.requireComponent(ShapeComponent).set('geometry', rectangle(width, height));
    level.world.requireComponent(PhysicsWorldComponent).set('walls', walls);
}

export function setGravity(level: Level, gravity: Point) {
    level.world.requireComponent(PhysicsWorldComponent).set('gravity', gravity);
}
