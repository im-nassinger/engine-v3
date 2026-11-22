import type { Entity } from '../../level/index.ts';

import type { PlayJoint } from '../joints/PlayJoints.ts';
import type { RemovalCause } from '../removal/RemovalMarks.ts';
import type { PlayRun } from '../run/PlayRun.ts';
import type { TickContext, TickPhase } from '../run/TickPhase.ts';

// The tick's last phase: removes the marked entities with everything inside them, their bodies and the
// joints with an end on those bodies, keeps the tags that ran out for the next tick's events, warns of the
// unknown inputs read, then adds the bodies that moved to the report.
export class EndOfTickPhase implements TickPhase {
    run(tick: TickContext) {
        const { run } = tick;

        for (const [entity, cause] of run.removals.take()) {
            // Already gone with a parent marked before it this tick.
            if (run.level.findEntity(entity.id) !== entity) continue;

            removeMarked(run, entity, cause);
        }
        run.triggers.endTick();

        for (const input of run.inputs.unknownInputs) {
            run.warnings.warn({ kind: 'unknownInput', input });
        }

        for (const id of run.poses.moved) {
            const pose = run.poses.poseOf(id);
            if (pose === undefined) continue;

            run.report.bodyMoved(id, pose);
        }
    }
}

// A joint goes with the body at either of its ends, as Delete does in the editor, and a joint entity can
// hold bodies with joints of their own, so this goes on until no joint is left to remove.
function removeMarked(run: PlayRun, top: Entity, cause: RemovalCause) {
    const removedBodies = new Set<Entity>();

    removeBodiesIn(run, top, removedBodies);
    run.triggers.removing(top);
    run.level.removeEntity(top);
    run.report.entityRemoved(top.id, cause);

    for (let going = jointsGoing(run, removedBodies); going.length > 0; going = jointsGoing(run, removedBodies)) {
        for (const joint of going) {
            removeJoint(run, joint, removedBodies);
        }
    }
}

// The joints with an end on a removed body, or whose entity was inside something removed.
function jointsGoing(run: PlayRun, removedBodies: ReadonlySet<Entity>) {
    const going = run.joints.attachedToAny(removedBodies);

    for (const joint of run.joints.all) {
        const stillInLevel = run.level.findEntity(joint.entity.id) === joint.entity;
        if (!stillInLevel && !going.includes(joint)) {
            going.push(joint);
        }
    }

    return going;
}

function removeJoint(run: PlayRun, joint: PlayJoint, removedBodies: Set<Entity>) {
    // Box2D already destroyed it with its body, if one of them went; destroyJoint allows that.
    run.scene.world.destroyJoint(joint.handle);
    run.joints.remove(joint);

    if (run.level.findEntity(joint.entity.id) !== joint.entity) return;

    removeBodiesIn(run, joint.entity, removedBodies);
    run.triggers.removing(joint.entity);
    run.level.removeEntity(joint.entity);
    run.report.jointRemoved(joint.entity.id);
}

// Every body built for the entity or anything inside it leaves the physics world and the run, and every
// joint entity inside it stops following its body.
function removeBodiesIn(run: PlayRun, top: Entity, removedBodies: Set<Entity>) {
    const waiting = [top];

    for (let entity = waiting.pop(); entity !== undefined; entity = waiting.pop()) {
        waiting.push(...entity.children);

        const body = run.bodyMatrices.remove(entity);
        if (body === undefined) continue;

        removedBodies.add(entity);
        run.scene.world.destroyBody(body.handle);
        run.poses.forget(entity.id);
        run.report.bodyRemoved(entity.id);
    }
}
