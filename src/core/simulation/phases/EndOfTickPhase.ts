import type { Entity } from '../../level/index.ts';

import type { PlayRun } from '../run/PlayRun.ts';
import type { TickContext, TickPhase } from '../run/TickPhase.ts';

// The tick's last phase: removes the marked entities with everything inside them and their bodies, then
// adds the bodies that moved to the report.
export class EndOfTickPhase implements TickPhase {
    run(tick: TickContext) {
        const { run } = tick;

        for (const [entity, cause] of run.removals.take()) {
            // Already gone with a parent marked before it this tick.
            if (run.level.findEntity(entity.id) !== entity) continue;

            removeBodiesIn(run, entity);
            run.level.removeEntity(entity);
            run.report.entityRemoved(entity.id, cause);
        }

        for (const id of run.poses.moved) {
            const pose = run.poses.poseOf(id);
            if (pose === undefined) continue;

            run.report.bodyMoved(id, pose);
        }
    }
}

// Every body built for the entity or anything inside it leaves the physics world and the run.
function removeBodiesIn(run: PlayRun, top: Entity) {
    const waiting = [top];

    for (let entity = waiting.pop(); entity !== undefined; entity = waiting.pop()) {
        waiting.push(...entity.children);

        const body = run.bodyMatrices.remove(entity);
        if (body === undefined) continue;

        run.scene.world.destroyBody(body.handle);
        run.poses.forget(entity.id);
        run.report.bodyRemoved(entity.id);
    }
}
