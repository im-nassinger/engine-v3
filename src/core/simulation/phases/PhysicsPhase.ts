import type { TickContext, TickPhase } from '../run/TickPhase.ts';

// One physics step of 1/60 s, then the moved bodies' poses, which their entities, their children and the
// joints moving with them follow, and the step's sensor events, which the run's touches are counted from.
export class PhysicsPhase implements TickPhase {
    run(tick: TickContext) {
        const { scene, poses, bodyMatrices, caches, triggers } = tick.run;

        poses.clearMoved();
        scene.world.step();
        scene.world.readMovedBodies(poses);
        triggers.readSensorEvents((into) => scene.world.readSensorEvents(into));

        for (const id of poses.moved) {
            const entity = bodyMatrices.entityOf(id);
            if (entity === undefined) continue;

            caches.bodyMoved(entity);
            for (const follower of bodyMatrices.followersOf(entity)) {
                caches.bodyMoved(follower);
            }
        }
    }
}
