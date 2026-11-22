import type { EntityId } from '../../fields/index.ts';
import type { PathGeometry, Point } from '../../geometry/index.ts';
import type { BodyPose } from '../../physics/index.ts';

import type { RemovalCause } from '../removal/RemovalMarks.ts';
import type { RunEnd } from '../end/RunEnd.ts';

import type { PlayWarning } from './PlayWarnings.ts';
import { POSE_STRIDE } from './TickReport.ts';
import type { JointPath, TickReport, ValueChanges } from './TickReport.ts';

// An entity's changed values: per component's type name, per key, the latest value.
type EntityChanges = Map<string, Map<string, unknown>>;

// Gathers what changed over the ticks since the last report, keeping only each body's latest pose, each
// joint's latest path and each changed value's latest value.
export class ReportCollector {
    private readonly movedPoses = new Map<EntityId, BodyPose>();
    private readonly teleported = new Set<EntityId>();
    private readonly changedValues = new Map<EntityId, EntityChanges>();
    private readonly removed: EntityId[] = [];
    private readonly removedPastHardLimit: EntityId[] = [];
    private readonly changedPaths = new Map<EntityId, PathGeometry>();

    bodyMoved(entity: EntityId, pose: BodyPose) {
        this.movedPoses.set(entity, pose);
    }

    // The body was moved there by a trigger, so the page draws it there without a slide.
    bodyTeleported(entity: EntityId) {
        this.teleported.add(entity);
    }

    // A body left the run, so its pose is no longer sent.
    bodyRemoved(entity: EntityId) {
        this.movedPoses.delete(entity);
        this.teleported.delete(entity);
    }

    // The component's values are replaced on every write, never changed in place, so the value is kept as is.
    valueChanged(entity: EntityId, component: string, key: string, value: unknown) {
        const entityChanges = this.changedValues.get(entity) ?? new Map<string, Map<string, unknown>>();
        const componentChanges = entityChanges.get(component) ?? new Map<string, unknown>();

        componentChanges.set(key, value);
        entityChanges.set(component, componentChanges);
        this.changedValues.set(entity, entityChanges);
    }

    pathChanged(joint: EntityId, path: PathGeometry) {
        this.changedPaths.set(joint, path);
    }

    // A joint that went with the body at one of its ends. Only bodies go past the hard limit, so it is
    // never in removedPastHardLimit.
    jointRemoved(joint: EntityId) {
        this.changedPaths.delete(joint);
        this.changedValues.delete(joint);
        this.removed.push(joint);
    }

    // The entity at the top of what was removed; the page removes everything inside it too.
    entityRemoved(entity: EntityId, cause: RemovalCause) {
        this.movedPoses.delete(entity);
        this.teleported.delete(entity);
        this.changedValues.delete(entity);
        this.changedPaths.delete(entity);
        this.removed.push(entity);
        if (cause === 'pastHardLimit') {
            this.removedPastHardLimit.push(entity);
        }
    }

    // Hands over everything gathered and starts again from nothing.
    take(lastTick: number, camera: Point, end: RunEnd | null, warnings: readonly PlayWarning[]): TickReport {
        const poses = new Float64Array(this.movedPoses.size * POSE_STRIDE);
        let offset = 0;

        for (const [entity, pose] of this.movedPoses) {
            const snap = this.teleported.has(entity) ? 1 : 0;
            poses.set([entity, pose.x, pose.y, pose.angle, snap], offset);
            offset += POSE_STRIDE;
        }

        const removed = [...this.removed];
        const removedPastHardLimit = [...this.removedPastHardLimit];
        const paths: JointPath[] = [];
        for (const [entity, path] of this.changedPaths) {
            paths.push({ entity, path });
        }
        const changes = this.takeChanges();
        this.movedPoses.clear();
        this.teleported.clear();
        this.removed.length = 0;
        this.removedPastHardLimit.length = 0;
        this.changedPaths.clear();

        return { lastTick, poses, removed, removedPastHardLimit, paths, camera, changes, end, warnings };
    }

    private takeChanges() {
        const changes: ValueChanges[] = [];

        for (const [entity, entityChanges] of this.changedValues) {
            for (const [component, values] of entityChanges) {
                const valuesByKey = Object.fromEntries(values);
                changes.push({ entity, component, values: valuesByKey });
            }
        }
        this.changedValues.clear();

        return changes;
    }
}
