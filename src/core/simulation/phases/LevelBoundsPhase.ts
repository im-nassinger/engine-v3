import { PhysicsWorldComponent } from '../../components/index.ts';
import { levelBoundsOf } from '../../derived/index.ts';
import type { Bounds } from '../../geometry/index.ts';
import type { Entity } from '../../level/index.ts';

import type { PlayRun } from '../run/PlayRun.ts';
import type { TickContext, TickPhase } from '../run/TickPhase.ts';

// Half the largest level, LevelLimits' maxLevelSize: no level's edge is further out on either axis.
const HARD_LIMIT_PX = 100_000;

// Marks the bodies that leave the level. With Walls off, a body whose subtree is fully outside the level
// bounds is marked, once it has been inside. With or without Walls, a body past the hard limit is marked.
// Only bodies move in v1, so only the bodies that moved this tick can change; the first tick looks at all.
export class LevelBoundsPhase implements TickPhase {
    private readonly beenInside = new Set<Entity>();
    private checkedAll = false;

    run(tick: TickContext) {
        const { run } = tick;
        const bounds = levelBoundsOf(run.level);
        const walls = run.level.world.getComponent(PhysicsWorldComponent)?.get('walls') ?? false;
        const openBounds = walls ? undefined : bounds;

        for (const entity of this.bodiesToCheck(run)) {
            this.check(run, entity, openBounds);
        }
        this.checkedAll = true;
    }

    private bodiesToCheck(run: PlayRun): Iterable<Entity> {
        if (!this.checkedAll) return run.scene.bodies.map((body) => body.entity);

        const moved: Entity[] = [];
        for (const id of run.poses.moved) {
            const entity = run.bodyMatrices.entityOf(id);
            if (entity === undefined) continue;

            moved.push(entity);
        }

        return moved;
    }

    private check(run: PlayRun, entity: Entity, openBounds: Bounds | undefined) {
        const pose = run.poses.poseOf(entity.id);
        if (pose === undefined) return;

        if (Math.abs(pose.x) > HARD_LIMIT_PX || Math.abs(pose.y) > HARD_LIMIT_PX) {
            run.removals.mark(entity, 'pastHardLimit');
            return;
        }

        if (openBounds === undefined) return;

        const drawn = run.caches.bounds.subtreeBoundsOf(entity);
        if (drawn === undefined) return;

        if (drawn.overlaps(openBounds)) {
            this.beenInside.add(entity);
        } else if (this.beenInside.has(entity)) {
            run.removals.mark(entity, 'openEdge');
        }
    }
}
