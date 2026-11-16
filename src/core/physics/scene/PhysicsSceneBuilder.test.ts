import { describe, expect, test } from 'vitest';

import {
    BodyComponent,
    JointComponent,
    PhysicsWorldComponent,
    ShapeComponent,
    SurfaceComponent,
    TransformComponent,
} from '../../components/index.ts';
import { DerivedCaches } from '../../derived/index.ts';
import { Matrix2D, ShapePieces } from '../../geometry/index.ts';
import type { Point, ShapeGeometry, TransformValues } from '../../geometry/index.ts';
import type { JointValues } from '../../components/index.ts';
import type { Entity } from '../../level/index.ts';
import { Level } from '../../level/index.ts';

import type { BodyDefinition } from '../contracts/BodyDefinition.ts';
import type { PhysicsEngine, WorldSettings } from '../contracts/PhysicsEngine.ts';
import type { BodyHandle, JointHandle } from '../contracts/Handles.ts';
import type { JointDefinition } from '../contracts/JointDefinition.ts';
import type { PhysicsWorld } from '../contracts/PhysicsWorld.ts';
import type { SurfaceDefinition } from '../contracts/SurfaceDefinition.ts';

import { PhysicsSceneBuilder } from './PhysicsSceneBuilder.ts';

type RecordedCall =
    | { readonly call: 'createBody'; readonly handle: BodyHandle; readonly definition: BodyDefinition }
    | { readonly call: 'addSurface'; readonly body: BodyHandle; readonly surface: SurfaceDefinition }
    | { readonly call: 'createJoint'; readonly handle: JointHandle; readonly definition: JointDefinition };

// A PhysicsWorld that only records what the builder hands it.
class RecordingWorld implements PhysicsWorld {
    readonly calls: RecordedCall[] = [];
    readonly settings: WorldSettings;
    private nextHandle = 1;

    constructor(settings: WorldSettings) {
        this.settings = settings;
    }

    createBody(definition: BodyDefinition) {
        const handle = this.nextHandle++;
        this.calls.push({ call: 'createBody', handle, definition });

        return handle;
    }

    addSurface(body: BodyHandle, surface: SurfaceDefinition) {
        this.calls.push({ call: 'addSurface', body, surface });
    }

    surfaces() {
        return this.calls.filter((call) => call.call === 'addSurface');
    }

    bodies() {
        return this.calls.filter((call) => call.call === 'createBody');
    }

    joints() {
        return this.calls.filter((call) => call.call === 'createJoint');
    }

    createJoint(definition: JointDefinition) {
        const handle = this.nextHandle++;
        this.calls.push({ call: 'createJoint', handle, definition });

        return handle;
    }
    destroyJoint() {}
    setGravity() {}
    step() {}
    readMovedBodies() {}
    velocityOf() {
        return { linear: { x: 0, y: 0 }, spin: 0 };
    }
    destroyBody() {}
    destroy() {}
}

class RecordingEngine implements PhysicsEngine {
    world: RecordingWorld | undefined;

    async load() {}

    createWorld(settings: WorldSettings) {
        this.world = new RecordingWorld(settings);

        return this.world;
    }
}

const SQUARE_20: ShapeGeometry = { kind: 'rectangle', width: 20, height: 20 };

function transform(x: number, y: number, rotation = 0, scale: Point = { x: 1, y: 1 }, skew = 0): TransformValues {
    return { position: { x, y }, rotation, scale, skew };
}

function place(level: Level, parent: Entity, values: TransformValues) {
    const entity = level.createEntity(parent, parent.children.length);
    entity.addComponent(new TransformComponent(values));

    return entity;
}

function withSurface(entity: Entity, geometry: ShapeGeometry = SQUARE_20) {
    entity.addComponent(new ShapeComponent({ geometry }));
    entity.addComponent(new SurfaceComponent());

    return entity;
}

function withBody(entity: Entity) {
    entity.addComponent(new BodyComponent());

    return entity;
}

function withJoint(entity: Entity, values: Partial<JointValues>) {
    entity.addComponent(new JointComponent({ ...JointComponent.schema.defaults(), ...values }));

    return entity;
}

function staticBody(entity: Entity) {
    entity.requireComponent(BodyComponent).set('type', 'static');

    return entity;
}

function onlyJoint(world: RecordingWorld) {
    const joints = world.joints();
    expect(joints).toHaveLength(1);
    const call = joints[0];
    if (call === undefined) throw new Error('No joint was built.');

    return call;
}

function build(level: Level) {
    const engine = new RecordingEngine();
    const scene = PhysicsSceneBuilder.build(level, new DerivedCaches(level), engine);
    if (engine.world === undefined) throw new Error('The builder made no world.');

    return { scene, world: engine.world };
}

function expectClosePoints(actual: readonly Point[], expected: readonly Point[]) {
    expect(actual).toHaveLength(expected.length);
    actual.forEach((point, position) => {
        expect(point.x).toBeCloseTo(expected[position]?.x ?? Number.NaN, 9);
        expect(point.y).toBeCloseTo(expected[position]?.y ?? Number.NaN, 9);
    });
}

describe('PhysicsSceneBuilder', () => {
    test("the world starts with the World's Gravity", () => {
        const level = Level.createNew();
        level.world.requireComponent(PhysicsWorldComponent).set('gravity', { x: 1, y: -3 });

        expect(build(level).world.settings.gravity).toEqual({ x: 1, y: -3 });
    });

    test('bodies and surfaces come in Entities panel order', () => {
        const level = Level.createNew();
        const first = withSurface(withBody(place(level, level.world, transform(0, 0))));
        const floor = withSurface(place(level, level.world, transform(0, 300)));
        const second = withSurface(withBody(place(level, level.world, transform(100, 0))));
        const { world, scene } = build(level);

        const order = world.calls.map((call) =>
            call.call === 'addSurface' ? `surface ${call.surface.entity}` : `body ${call.definition.entity}`,
        );
        expect(order).toEqual([
            `body ${first.id}`,
            `surface ${first.id}`,
            `body ${level.world.id}`,
            `surface ${floor.id}`,
            `body ${second.id}`,
            `surface ${second.id}`,
        ]);
        expect(scene.bodies.map((body) => body.entity)).toEqual([first, second]);
        expect(scene.ground).toBeDefined();
    });

    test('a car of three merged shapes is one body with three surfaces', () => {
        const level = Level.createNew();
        const car = withSurface(withBody(place(level, level.world, transform(200, 100, 30))));
        withSurface(place(level, car, transform(-40, 20)), { kind: 'circle', radius: 15 });
        withSurface(withBody(place(level, car, transform(40, 20))), { kind: 'circle', radius: 15 });
        const { world, scene } = build(level);

        expect(world.bodies()).toHaveLength(1);
        const handle = world.bodies()[0]?.handle;
        expect(world.surfaces()).toHaveLength(3);
        expect(world.surfaces().every((call) => call.body === handle)).toBe(true);
        expect(scene.bodies).toHaveLength(1);
        expect(scene.bodies[0]?.pose.x).toBeCloseTo(200, 9);
        expect(scene.bodies[0]?.pose.angle).toBeCloseTo(30, 9);
        expect(scene.ground).toBeUndefined();
    });

    test('a rotated, skewed, mirrored group gives the pieces the physics view draws', () => {
        const level = Level.createNew();
        const group = withBody(place(level, level.world, transform(150, -80, 35, { x: -1.5, y: 2 }, 12)));
        const box = withSurface(place(level, group, transform(30, 10, 20)));
        const wheel = withSurface(place(level, group, transform(-30, 10)), { kind: 'circle', radius: 12 });
        const caches = new DerivedCaches(level);
        const { world, scene } = build(level);
        const body = scene.bodies[0];
        if (body === undefined) throw new Error('No body was built.');
        const poseMatrix = Matrix2D.fromTransform(transform(body.pose.x, body.pose.y, body.pose.angle));

        expect(world.surfaces().map((call) => call.surface.entity)).toEqual([box.id, wheel.id]);
        for (const call of world.surfaces()) {
            const entity = call.surface.entity === box.id ? box : wheel;
            const levelMatrix = caches.worldMatrices.matrixOf(entity);
            const geometry = entity.requireComponent(ShapeComponent).get('geometry');
            const drawn = caches.pieces.piecesOf(entity)?.pieces ?? [];
            // The group skews, so the physics view draws the wheel as its 32-point polygon.
            const viewPieces = geometry.kind === 'circle' ? polygonPiecesOf(geometry) : drawn;

            expect(call.surface.pieces).toHaveLength(viewPieces.length);
            call.surface.pieces.forEach((piece, position) => {
                const viewPiece = viewPieces[position];
                if (piece.kind !== 'polygon' || viewPiece?.kind !== 'polygon') throw new Error('Expected polygons.');
                expectClosePoints(
                    piece.points.map((point) => poseMatrix.apply(point)),
                    viewPiece.points.map((point) => levelMatrix.apply(point)),
                );
            });
        }
    });

    test('an evenly scaled body keeps its circle a circle', () => {
        const level = Level.createNew();
        withSurface(withBody(place(level, level.world, transform(0, 0, 0, { x: 2, y: -2 }))), {
            kind: 'circle',
            radius: 10,
        });
        const piece = build(level).world.surfaces()[0]?.surface.pieces[0];

        if (piece?.kind !== 'circle') throw new Error('Expected a circle.');
        expect(piece.radius).toBeCloseTo(20, 9);
    });

    test('pieces too small to collide are skipped, and a surface with none adds nothing', () => {
        const level = Level.createNew();
        withSurface(withBody(place(level, level.world, transform(0, 0, 0, { x: 0.01, y: 0.01 }))));

        expect(build(level).world.surfaces()).toHaveLength(0);
    });

    test('a line on a Dynamic body is skipped and the rest of the body is built', () => {
        const level = Level.createNew();
        const cart = withSurface(withBody(place(level, level.world, transform(0, 0))));
        const line = withSurface(place(level, cart, transform(0, 0)), {
            kind: 'line',
            points: [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
            ],
        });
        const { world, scene } = build(level);

        expect(world.surfaces().map((call) => call.surface.entity)).toEqual([cart.id]);
        expect(scene.skippedLines).toEqual([line]);
    });

    test('Walls on gives four Static lines on the level bounds, and off none', () => {
        const level = Level.createNew();
        expect(build(level).world.calls).toHaveLength(0);

        level.world.requireComponent(PhysicsWorldComponent).set('walls', true);
        const { world, scene } = build(level);
        const walls = world.surfaces();

        expect(world.bodies()).toHaveLength(1);
        expect(world.bodies()[0]?.definition.type).toBe('static');
        expect(walls).toHaveLength(4);
        expect(walls.every((call) => call.body === scene.ground && call.surface.entity === level.world.id)).toBe(true);
        const corners = walls.map((call) => call.surface.pieces[0]);
        const geometry = level.world.requireComponent(ShapeComponent).get('geometry');
        if (geometry.kind !== 'rectangle') throw new Error('The World is a rectangle.');
        expect(corners[0]).toEqual({
            kind: 'line',
            points: [
                { x: -geometry.width / 2, y: -geometry.height / 2 },
                { x: geometry.width / 2, y: -geometry.height / 2 },
            ],
        });
    });
});

describe("PhysicsSceneBuilder's joints", () => {
    test("a car's two hinged wheels are two joints to the car's one body, after every body", () => {
        const level = Level.createNew();
        const car = withSurface(withBody(place(level, level.world, transform(0, 0))));
        const chassis = withSurface(place(level, car, transform(0, -20)));
        const wheels = [-30, 30].map((x) => {
            const wheel = withSurface(withBody(place(level, car, transform(x, 20))), { kind: 'circle', radius: 10 });
            wheel.requireComponent(BodyComponent).set('merge', false);

            return wheel;
        });
        const hinges = wheels.map((wheel, position) =>
            withJoint(place(level, car, transform(position === 0 ? -30 : 30, 20)), { a: wheel.id, b: chassis.id }),
        );
        const { world, scene } = build(level);

        const carHandle = world.bodies()[0]?.handle;
        const wheelHandles = world
            .bodies()
            .slice(1)
            .map((call) => call.handle);
        expect(world.bodies()).toHaveLength(3);
        expect(world.calls.slice(-2).map((call) => call.call)).toEqual(['createJoint', 'createJoint']);
        expect(world.joints().map((call) => [call.definition.bodyA, call.definition.bodyB])).toEqual([
            [wheelHandles[0], carHandle],
            [wheelHandles[1], carHandle],
        ]);
        expect(world.joints().map((call) => call.definition.endA)).toEqual([
            { x: -30, y: 20 },
            { x: 30, y: 20 },
        ]);
        expect(scene.joints.map((joint) => [joint.entity, joint.bodyA, joint.bodyB])).toEqual([
            [hinges[0], wheels[0], car],
            [hinges[1], wheels[1], car],
        ]);
        expect(scene.ground).toBeUndefined();
    });

    test('an empty B, and a B that is a surface without a body, go to the ground body', () => {
        const level = Level.createNew();
        const box = withSurface(withBody(place(level, level.world, transform(0, 0))));
        const floor = withSurface(place(level, level.world, transform(0, 300)));
        withJoint(place(level, level.world, transform(0, 0)), { a: box.id });
        withJoint(place(level, level.world, transform(0, 0)), { type: 'rope', a: box.id, b: floor.id });
        const { world, scene } = build(level);

        expect(scene.ground).toBeDefined();
        expect(world.joints().map((call) => call.definition.bodyB)).toEqual([scene.ground, scene.ground]);
        expect(scene.joints.map((joint) => joint.bodyB)).toEqual([undefined, undefined]);
    });

    test('a hidden joint is built', () => {
        const level = Level.createNew();
        const box = withSurface(withBody(place(level, level.world, transform(0, 0))));
        const hinge = withJoint(place(level, level.world, transform(0, 0)), { a: box.id });
        hinge.setHidden(true);

        expect(build(level).scene.joints.map((joint) => joint.entity)).toEqual([hinge]);
    });

    test('each joint play leaves out has its reason, and a skipped pin makes no ground', () => {
        const level = Level.createNew();
        const box = withSurface(withBody(place(level, level.world, transform(0, 0))));
        const part = withSurface(place(level, box, transform(10, 0)));
        const decoration = place(level, level.world, transform(50, 0));
        const wall = staticBody(withSurface(withBody(place(level, level.world, transform(100, 0)))));
        const post = staticBody(withSurface(withBody(place(level, level.world, transform(200, 0)))));
        const skipped = [
            withJoint(place(level, level.world, transform(0, 0)), { a: decoration.id }),
            withJoint(place(level, level.world, transform(0, 0)), { a: 9_999 }),
            withJoint(place(level, level.world, transform(0, 0)), { a: null, b: box.id }),
            withJoint(place(level, level.world, transform(0, 0)), { a: box.id, b: part.id }),
            withJoint(place(level, level.world, transform(0, 0)), { a: wall.id, b: post.id }),
            withJoint(place(level, level.world, transform(0, 0)), { a: wall.id }),
            withJoint(place(level, level.camera, transform(0, 0)), { a: box.id }),
        ];
        const { world, scene } = build(level);

        expect(world.joints()).toHaveLength(0);
        expect(scene.joints).toHaveLength(0);
        expect(scene.ground).toBeUndefined();
        const reasons = new Map(scene.skippedJoints.map((skip) => [skip.entity, skip.reason]));
        expect(skipped.map((joint) => reasons.get(joint))).toEqual([
            'noPhysics',
            'noPhysics',
            'noPhysics',
            'sameBody',
            'cannotMove',
            'cannotMove',
            'insideCamera',
        ]);
        expect(scene.skippedJoints).toHaveLength(skipped.length);
    });

    test("a group scaled by 2 doubles a Rope's typed Length and its drawn gap", () => {
        const level = Level.createNew();
        const group = place(level, level.world, transform(0, 0, 0, { x: 2, y: 2 }));
        const weight = withSurface(withBody(place(level, group, transform(0, 50))));
        const ends = { a: { x: 0, y: 25 }, b: { x: 0, y: -25 } };
        withJoint(place(level, group, transform(0, 0)), {
            type: 'rope',
            a: weight.id,
            matchDrawnDistance: false,
            length: 80,
            ends,
        });
        withJoint(place(level, group, transform(0, 0)), { type: 'spring', a: weight.id, ends });
        const { world } = build(level);

        const [rope, spring] = world.joints().map((call) => call.definition);
        if (rope?.type !== 'rope' || spring?.type !== 'spring') throw new Error('Expected a Rope and a Spring.');
        expect(rope.length).toBeCloseTo(160, 9);
        expect(rope.endA).toEqual({ x: 0, y: 50 });
        expect(rope.endB).toEqual({ x: 0, y: -50 });
        expect(spring.restLength).toBeCloseTo(100, 9);
        expect(spring.stiffness).toBe(2);
        expect(spring.damping).toBe(0.3);
    });

    test("a mirrored group swaps and negates a Hinge's limits and its motor speed", () => {
        const level = Level.createNew();
        const values = {
            limitRotation: true,
            minAngle: -30,
            maxAngle: 60,
            motor: true,
            motorSpeed: 90,
            ends: { a: { x: 5, y: 0 }, b: { x: 0, y: 0 } },
        };
        const plain = place(level, level.world, transform(0, 0));
        const mirrored = place(level, level.world, transform(500, 0, 0, { x: -1, y: 1 }));
        for (const group of [plain, mirrored]) {
            const wheel = withSurface(withBody(place(level, group, transform(0, 0))), { kind: 'circle', radius: 10 });
            withJoint(place(level, group, transform(0, 0)), { ...values, a: wheel.id });
        }
        const { world } = build(level);

        const [kept, flipped] = world.joints().map((call) => call.definition);
        if (kept?.type !== 'hinge' || flipped?.type !== 'hinge') throw new Error('Expected two Hinges.');
        expect([kept.minAngle, kept.maxAngle, kept.motorSpeed]).toEqual([-30, 60, 90]);
        expect([flipped.minAngle, flipped.maxAngle, flipped.motorSpeed]).toEqual([-60, 30, -90]);
        expect(flipped.endA).toEqual({ x: 495, y: 0 });
        expect(flipped.endB).toEqual(flipped.endA);
    });

    test("a Hinge's settings reach the world as they are", () => {
        const level = Level.createNew();
        const door = withSurface(withBody(place(level, level.world, transform(0, 0))));
        withJoint(place(level, level.world, transform(0, 0)), {
            a: door.id,
            letConnectedObjectsCollide: true,
            motorStrength: 70,
            resistance: 12,
        });
        const call = onlyJoint(build(level).world);

        expect(call.definition).toMatchObject({
            type: 'hinge',
            letConnectedObjectsCollide: true,
            limitRotation: false,
            motor: false,
            motorStrength: 70,
            resistance: 12,
        });
    });
});

function polygonPiecesOf(geometry: ShapeGeometry) {
    return ShapePieces.buildAsPolygons(geometry).pieces;
}
