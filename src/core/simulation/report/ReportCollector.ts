import type { EntityId } from '../../fields/index.ts';
import type { PathGeometry, Point } from '../../geometry/index.ts';
import type { BodyPose } from '../../physics/index.ts';

import type { RemovalCause } from '../removal/RemovalMarks.ts';

import { POSE_STRIDE } from './TickReport.ts';
import type { JointPath, TickReport } from './TickReport.ts';

// Gathers what changed over the ticks since the last report, keeping only each body's latest pose and each
// joint's latest path.
export class ReportCollector {
    private readonly movedPoses = new Map<EntityId, BodyPose>();
    private readonly removed: EntityId[] = [];
    private readonly removedPastHardLimit: EntityId[] = [];
    private readonly changedPaths = new Map<EntityId, PathGeometry>();

    bodyMoved(entity: EntityId, pose: BodyPose) {
        this.movedPoses.set(entity, pose);
    }

    // A body left the run, so its pose is no longer sent.
    bodyRemoved(entity: EntityId) {
        this.movedPoses.delete(entity);
    }

    pathChanged(joint: EntityId, path: PathGeometry) {
        this.changedPaths.set(joint, path);
    }

    // A joint that went with the body at one of its ends. Only bodies go past the hard limit, so it is
    // never in removedPastHardLimit.
    jointRemoved(joint: EntityId) {
        this.changedPaths.delete(joint);
        this.removed.push(joint);
    }

    // The entity at the top of what was removed; the page removes everything inside it too.
    entityRemoved(entity: EntityId, cause: RemovalCause) {
        this.movedPoses.delete(entity);
        this.changedPaths.delete(entity);
        this.removed.push(entity);
        if (cause === 'pastHardLimit') {
            this.removedPastHardLimit.push(entity);
        }
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
        const removedPastHardLimit = [...this.removedPastHardLimit];
        const paths: JointPath[] = [];
        for (const [entity, path] of this.changedPaths) {
            paths.push({ entity, path });
        }
        this.movedPoses.clear();
        this.removed.length = 0;
        this.removedPastHardLimit.length = 0;
        this.changedPaths.clear();

        return { lastTick, poses, removed, removedPastHardLimit, paths, camera };
    }
}
