import type { TickContext, TickPhase } from '../run/TickPhase.ts';

// One physics step of 1/60 s, then the moved bodies' poses, which their entities and children follow.
export class PhysicsPhase implements TickPhase {
    run(tick: TickContext) {
        const { scene, poses, bodyMatrices, caches } = tick.run;

        poses.clearMoved();
        scene.world.step();
        scene.world.readMovedBodies(poses);

        for (const id of poses.moved) {
            const entity = bodyMatrices.entityOf(id);
            if (entity === undefined) continue;

            caches.bodyMoved(entity);
        }
    }
}
