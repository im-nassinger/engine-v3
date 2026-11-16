import type { EntityId } from '../../fields/index.ts';
import type { Point } from '../../geometry/index.ts';
import type { BodyPose } from '../../physics/index.ts';

import { POSE_STRIDE } from './TickReport.ts';
import type { TickReport } from './TickReport.ts';

// Gathers what changed over the ticks since the last report, keeping only each body's latest pose.
export class ReportCollector {
    private readonly movedPoses = new Map<EntityId, BodyPose>();
    private readonly removed: EntityId[] = [];

    bodyMoved(entity: EntityId, pose: BodyPose) {
        this.movedPoses.set(entity, pose);
    }

    entityRemoved(entity: EntityId) {
        this.movedPoses.delete(entity);
        this.removed.push(entity);
    }

    // Hands over everything gathered and starts again from nothing.
    take(lastTick: number, camera: Point): TickReport {
        const poses = new Float64Array(this.movedPoses.size * POSE_STRIDE);
        let offset = 0;

        for (const [entity, pose] of this.movedPoses) {
            // Nothing teleports or spawns in v1, so no body needs a snap yet.
            const snap = 0;
            poses.set([entity, pose.x, pose.y, pose.angle, snap], offset);
            offset += POSE_STRIDE;
        }

        const removed = [...this.removed];
        this.movedPoses.clear();
        this.removed.length = 0;

        return { lastTick, poses, removed, camera };
    }
}
