import type { Matrix2D } from '../../geometry/index.ts';
import type { Entity } from '../../level/index.ts';

import type { BodyPose } from '../contracts/BodyPose.ts';
import type { BodyHandle } from '../contracts/Handles.ts';
import type { PhysicsWorld } from '../contracts/PhysicsWorld.ts';

// One body play built: its entity, its handle in the physics world, and its level matrix split into the
// pose Box2D moves and the rest it keeps.
export type SceneBody = {
    readonly entity: Entity;
    readonly handle: BodyHandle;
    readonly pose: BodyPose;
    readonly rest: Matrix2D;
};

// What PhysicsSceneBuilder built for one run. The ground is the one Static body holding the surfaces with
// no body on them or above them and the Walls, named after the World; undefined when nothing needs it.
export type PhysicsScene = {
    readonly world: PhysicsWorld;
    readonly bodies: readonly SceneBody[];
    readonly ground: BodyHandle | undefined;
    // Lines left out because they go into a Dynamic body, in Entities panel order.
    readonly skippedLines: readonly Entity[];
};
