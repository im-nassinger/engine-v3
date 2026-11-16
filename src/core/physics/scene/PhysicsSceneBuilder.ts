import { BodyComponent, PhysicsWorldComponent, SurfaceComponent } from '../../components/index.ts';
import type { PiecesCache, WorldMatrixCache } from '../../derived/index.ts';
import { levelBoundsOf } from '../../derived/index.ts';
import type { Matrix2D, Point } from '../../geometry/index.ts';
import type { Entity, Level } from '../../level/index.ts';

import type { BodyDefinition } from '../contracts/BodyDefinition.ts';
import type { PhysicsEngine } from '../contracts/PhysicsEngine.ts';
import type { BodyHandle, PhysicsWorld } from '../contracts/PhysicsWorld.ts';
import type { SurfaceDefinition, SurfacePiece } from '../contracts/SurfaceDefinition.ts';
import { BodyMembership } from '../membership/BodyMembership.ts';

import type { PhysicsScene, SceneBody } from './PhysicsScene.ts';
import { piecesInBodySpace } from './piecesInBodySpace.ts';
import { splitBodyMatrix } from './splitBodyMatrix.ts';

// The play copy's caches the builder reads: each shape's pieces and each entity's level matrix.
export type SceneCaches = {
    readonly pieces: PiecesCache;
    readonly worldMatrices: WorldMatrixCache;
};

type BuiltBody = SceneBody & {
    // From level positions to the body's space: the inverse of its pose.
    readonly fromLevel: Matrix2D;
};

// Turns the play copy into the physics world's bodies and surfaces, in Entities panel order, so Box2D
// receives everything in the same order on every computer. Joints come with stage 14.
export class PhysicsSceneBuilder {
    private readonly level: Level;
    private readonly caches: SceneCaches;
    private readonly membership: BodyMembership;
    private readonly world: PhysicsWorld;
    private readonly bodies = new Map<Entity, BuiltBody>();
    private readonly skippedLines: Entity[] = [];
    private ground: BodyHandle | undefined;

    private constructor(level: Level, caches: SceneCaches, world: PhysicsWorld) {
        this.level = level;
        this.caches = caches;
        this.membership = new BodyMembership(level);
        this.world = world;
    }

    // Makes a world with the World's Gravity and builds the level into it.
    static build(level: Level, caches: SceneCaches, engine: PhysicsEngine): PhysicsScene {
        const gravity = level.world.requireComponent(PhysicsWorldComponent).get('gravity');
        const world = engine.createWorld({ gravity });
        const builder = new PhysicsSceneBuilder(level, caches, world);

        return builder.buildAll();
    }

    private buildAll(): PhysicsScene {
        for (const entity of this.level.entitiesInPanelOrder()) {
            if (this.membership.isBuiltBody(entity)) {
                this.buildBody(entity);
            }
            this.addSurfaceOf(entity);
        }
        this.addWalls();

        const bodies = [...this.bodies.values()].map(({ entity, handle, pose, rest }) => ({
            entity,
            handle,
            pose,
            rest,
        }));

        return { world: this.world, bodies, ground: this.ground, skippedLines: this.skippedLines };
    }

    private buildBody(entity: Entity) {
        const body = entity.requireComponent(BodyComponent);
        const split = splitBodyMatrix(this.caches.worldMatrices.matrixOf(entity));
        const definition: BodyDefinition = {
            entity: entity.id,
            type: body.get('type'),
            position: { x: split.pose.x, y: split.pose.y },
            angle: split.pose.angle,
            gravityScale: body.get('gravityScale'),
            linearDamping: body.get('linearDamping'),
            angularDamping: body.get('angularDamping'),
            fixedRotation: body.get('fixedRotation'),
            bullet: body.get('bullet'),
        };
        const handle = this.world.createBody(definition);
        const fromLevel = split.poseMatrix.invert();
        if (fromLevel === undefined) throw new Error('A pose without scale always inverts.');

        this.bodies.set(entity, { entity, handle, pose: split.pose, rest: split.rest, fromLevel });
    }

    private addSurfaceOf(entity: Entity) {
        const target = this.membership.surfaceTargetOf(entity);
        if (target === undefined) return;

        switch (target.kind) {
            case 'skipped':
                this.skippedLines.push(entity);
                return;
            case 'static':
                this.addSurface(this.requireGround(), entity, this.caches.worldMatrices.matrixOf(entity));
                return;
            case 'body':
                this.addSurfaceToBody(entity, this.requireBody(target.body));
                return;
        }
    }

    private addSurfaceToBody(entity: Entity, body: BuiltBody) {
        // The body's own surface uses its rest exactly, so a body alone has no rounding from the inverse.
        const toBody =
            entity === body.entity ? body.rest : body.fromLevel.multiply(this.caches.worldMatrices.matrixOf(entity));
        this.addSurface(body.handle, entity, toBody);
    }

    private addSurface(handle: BodyHandle, entity: Entity, toBody: Matrix2D) {
        const pieces = piecesInBodySpace(entity, toBody, this.caches.pieces);
        if (pieces.length === 0) return;

        const surface = entity.requireComponent(SurfaceComponent);
        const values: SurfaceValuesRead = {
            density: surface.get('density'),
            friction: surface.get('friction'),
            restitution: surface.get('restitution'),
            sensor: surface.get('sensor'),
        };
        this.world.addSurface(handle, surfaceDefinition(entity.id, pieces, values));
    }

    // Four Static lines on the level bounds, with a SurfaceComponent's default values.
    private addWalls() {
        if (this.level.world.requireComponent(PhysicsWorldComponent).get('walls') !== true) return;

        const bounds = levelBoundsOf(this.level);
        if (bounds === undefined) return;

        const topLeft = { x: bounds.left, y: bounds.top };
        const topRight = { x: bounds.right, y: bounds.top };
        const bottomRight = { x: bounds.right, y: bounds.bottom };
        const bottomLeft = { x: bounds.left, y: bounds.bottom };
        const edges: readonly (readonly Point[])[] = [
            [topLeft, topRight],
            [topRight, bottomRight],
            [bottomRight, bottomLeft],
            [bottomLeft, topLeft],
        ];

        const ground = this.requireGround();
        const values = SurfaceComponent.schema.defaults();
        for (const edge of edges) {
            const piece: SurfacePiece = { kind: 'line', points: edge };
            this.world.addSurface(ground, surfaceDefinition(this.level.world.id, [piece], values));
        }
    }

    private requireGround() {
        this.ground ??= this.world.createBody(groundDefinition(this.level.world.id));

        return this.ground;
    }

    private requireBody(entity: Entity) {
        const body = this.bodies.get(entity);
        if (body === undefined) throw new Error(`Body ${entity.id} is built after a surface that goes into it.`);

        return body;
    }
}

type SurfaceValuesRead = {
    readonly density: number;
    readonly friction: number;
    readonly restitution: number;
    readonly sensor: boolean;
};

function surfaceDefinition(
    entity: number,
    pieces: readonly SurfacePiece[],
    values: SurfaceValuesRead,
): SurfaceDefinition {
    return {
        entity,
        pieces,
        density: values.density,
        friction: values.friction,
        restitution: values.restitution,
        sensor: values.sensor,
    };
}

function groundDefinition(world: number): BodyDefinition {
    return {
        entity: world,
        type: 'static',
        position: { x: 0, y: 0 },
        angle: 0,
        gravityScale: 1,
        linearDamping: 0,
        angularDamping: 0,
        fixedRotation: false,
        bullet: false,
    };
}
