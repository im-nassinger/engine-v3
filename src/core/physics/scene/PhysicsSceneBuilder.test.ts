import { describe, expect, test } from 'vitest';

import {
    BodyComponent,
    PhysicsWorldComponent,
    ShapeComponent,
    SurfaceComponent,
    TransformComponent,
} from '../../components/index.ts';
import { DerivedCaches } from '../../derived/index.ts';
import { Matrix2D, ShapePieces } from '../../geometry/index.ts';
import type { Point, ShapeGeometry, TransformValues } from '../../geometry/index.ts';
import type { Entity } from '../../level/index.ts';
import { Level } from '../../level/index.ts';

import type { BodyDefinition } from '../contracts/BodyDefinition.ts';
import type { PhysicsEngine, WorldSettings } from '../contracts/PhysicsEngine.ts';
import type { BodyHandle, PhysicsWorld } from '../contracts/PhysicsWorld.ts';
import type { SurfaceDefinition } from '../contracts/SurfaceDefinition.ts';

import { PhysicsSceneBuilder } from './PhysicsSceneBuilder.ts';

type RecordedCall =
    | { readonly call: 'createBody'; readonly handle: BodyHandle; readonly definition: BodyDefinition }
    | { readonly call: 'addSurface'; readonly body: BodyHandle; readonly surface: SurfaceDefinition };

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
            call.call === 'createBody' ? `body ${call.definition.entity}` : `surface ${call.surface.entity}`,
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

function polygonPiecesOf(geometry: ShapeGeometry) {
    return ShapePieces.buildAsPolygons(geometry).pieces;
}
