import { createV1Registry } from '../../components/index.ts';
import { DerivedCaches } from '../../derived/index.ts';
import { FormatUpgrader, LevelReader, V1_LEVEL_LIMITS } from '../../level-data/index.ts';
import type { LevelData, ReadOutcome } from '../../level-data/index.ts';
import type { Level } from '../../level/index.ts';
import { BodyPoses, PhysicsSceneBuilder } from '../../physics/index.ts';
import type { ComponentRegistry } from '../../components/index.ts';
import type { PhysicsEngine, PhysicsScene } from '../../physics/index.ts';

import { BodyMatrices } from '../bodies/BodyMatrices.ts';
import { PlayJoints } from '../joints/PlayJoints.ts';

// A level read for play, with each body split into its pose and rest, and each joint following its A's body.
export type PlayCopy = {
    readonly level: Level;
    // The components the level was read with, which Change value reads the schemas of.
    readonly registry: ComponentRegistry;
    readonly caches: DerivedCaches;
    readonly scene: PhysicsScene;
    readonly poses: BodyPoses;
    readonly bodyMatrices: BodyMatrices;
    readonly joints: PlayJoints;
};

// Reads the level data and builds its physics scene. The worker's play copy and the page's PlayMirror both
// come from here, so the mirror's matrices are the play copy's. The engine must be loaded already.
export function startPlayCopy(levelData: LevelData, engine: PhysicsEngine): ReadOutcome<PlayCopy> {
    const registry = createV1Registry();
    const reader = new LevelReader(registry, V1_LEVEL_LIMITS, FormatUpgrader.createV1());
    const read = reader.read(levelData);
    if (!read.ok) return read;

    const level = read.value;
    const poses = new BodyPoses();
    const bodyMatrices = new BodyMatrices(poses);
    const caches = new DerivedCaches(level, bodyMatrices);
    const scene = PhysicsSceneBuilder.build(level, caches, engine);

    // From here on each body entity's matrix is its pose times its rest.
    for (const body of scene.bodies) {
        poses.place(body.entity.id, body.pose);
        bodyMatrices.add(body);
        caches.bodyMoved(body.entity);
    }

    // Read before any joint follows its body, from the joints' level matrices at the start.
    const joints = PlayJoints.fromScene(scene.joints, caches.worldMatrices, bodyMatrices);

    // Each joint moves with its A's body; a joint whose A is the ground stays where it is.
    for (const joint of scene.joints) {
        if (joint.bodyA === undefined) continue;

        const levelMatrix = caches.worldMatrices.matrixOf(joint.entity);
        bodyMatrices.addFollower(joint.entity, joint.bodyA, levelMatrix);
        caches.bodyMoved(joint.entity);
    }

    const playCopy = { level, registry, caches, scene, poses, bodyMatrices, joints };

    return { ok: true, value: playCopy };
}
