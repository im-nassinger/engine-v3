import {
    BodyComponent,
    JointComponent,
    NameComponent,
    PathComponent,
    PhysicsWorldComponent,
    ShapeComponent,
    SurfaceComponent,
    TransformComponent,
} from '../../../../src/core/components/index.ts';
import type { BodyValues, JointValues, SurfaceValues } from '../../../../src/core/components/index.ts';
import type { Point, ShapeGeometry, TransformValues } from '../../../../src/core/geometry/index.ts';
import type { Entity, Level } from '../../../../src/core/level/index.ts';
import { jointPathPoints } from '../../../../src/core/physics/index.ts';

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
// A shape with no SurfaceComponent: out of physics, or, under a touch trigger, passed through and noticed.
export function addShape(entity: Entity, geometry: ShapeGeometry) {
    entity.addComponent(new ShapeComponent({ geometry }));

    return entity;
}

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

// A joint placed as the Joint tool places one: at the hinge point, or halfway between a Rope or Spring's two ends,
// with its ends in its own space. Both ends are given in level positions, and A's end is the hinge point.
export function addJoint(
    level: Level,
    name: string,
    joint: Pick<JointValues, 'type' | 'a' | 'b'> & Partial<JointValues>,
    endA: Point,
    endB: Point = endA,
) {
    const hinge = joint.type === 'hinge';
    const position = hinge ? endA : { x: (endA.x + endB.x) / 2, y: (endA.y + endB.y) / 2 };
    const ends = {
        a: { x: endA.x - position.x, y: endA.y - position.y },
        b: { x: endB.x - position.x, y: endB.y - position.y },
    };
    const gap = Math.hypot(endB.x - endA.x, endB.y - endA.y);
    const entity = addEntity(level, level.world, name, { position });
    entity.addComponent(
        new JointComponent({
            ...JointComponent.schema.defaults(),
            letConnectedObjectsCollide: !hinge,
            // Length and Rest length from the drawn gap, which a Hinge doesn't have.
            ...(hinge ? {} : { length: gap, restLength: gap }),
            ...joint,
            ends,
        }),
    );
    if (joint.type !== 'hinge') {
        entity.addComponent(new PathComponent({ path: jointPathPoints(joint.type, ends.a, ends.b) }));
    }

    return entity;
}
