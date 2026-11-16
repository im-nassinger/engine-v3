import type { BodyDefinition, BodyPoses, PhysicsWorld, SurfaceDefinition } from '../../../core/physics/index.ts';

export const EARTH_GRAVITY = { x: 0, y: 9.8 };
export const NO_GRAVITY = { x: 0, y: 0 };

export function bodyDefinition(changes: Partial<BodyDefinition>): BodyDefinition {
    return {
        entity: 1,
        type: 'dynamic',
        position: { x: 0, y: 0 },
        angle: 0,
        gravityScale: 1,
        linearDamping: 0,
        angularDamping: 0,
        fixedRotation: false,
        bullet: false,
        ...changes,
    };
}

export function surfaceDefinition(changes: Partial<SurfaceDefinition>): SurfaceDefinition {
    return {
        entity: 1,
        pieces: [],
        density: 1,
        friction: 0.3,
        restitution: 0,
        sensor: false,
        ...changes,
    };
}

// A width × height box centred on its body, as a polygon piece.
export function boxPiece(width: number, height: number) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const points = [
        { x: -halfWidth, y: -halfHeight },
        { x: halfWidth, y: -halfHeight },
        { x: halfWidth, y: halfHeight },
        { x: -halfWidth, y: halfHeight },
    ];

    return { kind: 'polygon', points } as const;
}

// Steps the world, keeping every pose it reports, and returns the moves of the last step.
export function stepTimes(world: PhysicsWorld, poses: BodyPoses, steps: number) {
    for (let i = 0; i < steps; i++) {
        poses.clearMoved();
        world.step();
        world.readMovedBodies(poses);
    }

    return [...poses.moved];
}
