import type { Matrix2D } from '../../geometry/index.ts';
import type { Entity } from '../../level/index.ts';

import type { BodyPose } from '../contracts/BodyPose.ts';
import type { BodyHandle, JointHandle } from '../contracts/Handles.ts';
import type { PhysicsWorld } from '../contracts/PhysicsWorld.ts';

// One body play built: its entity, its handle in the physics world, and its level matrix split into the
// pose Box2D moves and the rest it keeps.
export type SceneBody = {
    readonly entity: Entity;
    readonly handle: BodyHandle;
    readonly pose: BodyPose;
    readonly rest: Matrix2D;
};

// One joint play built. bodyA and bodyB are the entities of its two bodies, undefined for the ground.
export type SceneJoint = {
    readonly entity: Entity;
    readonly handle: JointHandle;
    readonly bodyA: Entity | undefined;
    readonly bodyB: Entity | undefined;
};

// Why play left a joint out, kept for v3's warnings. noPhysics: an end that is neither a body nor a
// surface, or is missing. sameBody: both ends on one body. cannotMove: neither end Dynamic. insideCamera:
// positions there are screen positions.
export type JointSkipReason = 'noPhysics' | 'sameBody' | 'cannotMove' | 'insideCamera';

export type SkippedJoint = {
    readonly entity: Entity;
    readonly reason: JointSkipReason;
};

// What PhysicsSceneBuilder built for one run. The ground is the one Static body holding the surfaces with
// no body on them or above them, the Walls and the background joints pin to, named after the World; undefined when nothing needs it.
export type PhysicsScene = {
    readonly world: PhysicsWorld;
    readonly bodies: readonly SceneBody[];
    readonly ground: BodyHandle | undefined;
    // Lines left out because they go into a Dynamic body, in Entities panel order.
    readonly skippedLines: readonly Entity[];
    // In Entities panel order, built after every body and surface.
    readonly joints: readonly SceneJoint[];
    readonly skippedJoints: readonly SkippedJoint[];
};
