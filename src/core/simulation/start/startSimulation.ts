import { createV1Registry } from '../../components/index.ts';
import { DerivedCaches } from '../../derived/index.ts';
import { FormatUpgrader, LevelReader, V1_LEVEL_LIMITS } from '../../level-data/index.ts';
import type { LevelData, ReadOutcome } from '../../level-data/index.ts';
import { BodyPoses, PhysicsSceneBuilder } from '../../physics/index.ts';
import type { PhysicsEngine } from '../../physics/index.ts';

import { BodyMatrices } from '../bodies/BodyMatrices.ts';
import { PlayJoints } from '../joints/PlayJoints.ts';
import { EndOfTickPhase } from '../phases/EndOfTickPhase.ts';
import { InputPhase } from '../phases/InputPhase.ts';
import { JointPathPhase } from '../phases/JointPathPhase.ts';
import { LevelBoundsPhase } from '../phases/LevelBoundsPhase.ts';
import { PhysicsPhase } from '../phases/PhysicsPhase.ts';
import { RemovalMarks } from '../removal/RemovalMarks.ts';
import { ReportCollector } from '../report/ReportCollector.ts';

import type { RunStart } from '../run/RunStart.ts';
import { Simulation } from '../run/Simulation.ts';

// The one way to build a run, used by runHeadless and the game worker alike, so the determinism test
// proves the worker's runs. The engine must be loaded already.
export function startSimulation(levelData: LevelData, engine: PhysicsEngine, start: RunStart): ReadOutcome<Simulation> {
    const reader = new LevelReader(createV1Registry(), V1_LEVEL_LIMITS, FormatUpgrader.createV1());
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

    const removals = new RemovalMarks();
    const run = { level, caches, scene, poses, bodyMatrices, joints, removals, report: new ReportCollector() };
    const phases = [
        new InputPhase(),
        new PhysicsPhase(),
        new JointPathPhase(),
        new LevelBoundsPhase(),
        new EndOfTickPhase(),
    ];
    const simulation = new Simulation(run, start, phases);

    return { ok: true, value: simulation };
}
