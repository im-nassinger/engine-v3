import { PathComponent } from '../../../core/components/index.ts';
import { Signal } from '../../../core/events/index.ts';
import type { EntityId } from '../../../core/fields/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { LevelData, ReadOutcome } from '../../../core/level-data/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { BodyPose } from '../../../core/physics/index.ts';
import {
    CameraSettings,
    jointPathOf,
    POSE_STRIDE,
    startingCameraPosition,
    startPlayCopy,
} from '../../../core/simulation/index.ts';
import type { CameraBox, PlayCopy, TickReport } from '../../../core/simulation/index.ts';

import { NoPhysicsEngine } from './NoPhysicsEngine.ts';

// A body that moved in the last report: where it was before it and where it is now.
type BodyMove = {
    readonly entity: Entity;
    readonly from: BodyPose;
    readonly to: BodyPose;
    // Drawn at its new pose with no slide, as a teleport or a spawn is.
    readonly snap: boolean;
};

// The page's own copy of the running level, updated from tick reports and drawn by the level view. It is
// read from the same level data as the worker's play copy, with the same code splitting each body into
// its pose and rest, so after each report its level matrices are the play copy's. Between reports it
// draws each moved body and the camera part of the way from their last pose to their new one.
export class PlayMirror {
    // The camera's box, which the level view fits to the window. It is the same all through a run.
    readonly cameraBox: CameraBox;
    // Each body placed at a pose, and each entity that follows it, so the level view draws it there.
    readonly placed = new Signal<Entity>();
    private readonly copy: PlayCopy;
    private moves = new Map<EntityId, BodyMove>();
    private cameraFrom: Point;
    private cameraTo: Point;
    private drawnCamera: Point;
    private lastTick = 0;

    private constructor(copy: PlayCopy, camera: Point, cameraBox: CameraBox) {
        this.copy = copy;
        this.cameraBox = cameraBox;
        this.cameraFrom = camera;
        this.cameraTo = camera;
        this.drawnCamera = camera;
    }

    // Refuses level data the reader can't read, which the worker refuses too.
    static start(levelData: LevelData): ReadOutcome<PlayMirror> {
        const started = startPlayCopy(levelData, new NoPhysicsEngine());
        if (!started.ok) return started;

        const copy = started.value;
        const settings = new CameraSettings(copy.level, copy.caches);
        const camera = startingCameraPosition(settings, copy.level);

        return { ok: true, value: new PlayMirror(copy, camera, settings.box) };
    }

    get level() {
        return this.copy.level;
    }

    get caches() {
        return this.copy.caches;
    }

    // A body's or a follower's level matrix from its pose; undefined for every other entity.
    matrixOf(entity: Entity) {
        return this.copy.bodyMatrices.matrixOf(entity);
    }

    // The last tick a report reached, 0 before the first.
    get tick() {
        return this.lastTick;
    }

    // Where the camera is drawn, as of the last drawAt or report.
    get camera() {
        return this.drawnCamera;
    }

    // Takes in one report. Every body and the camera are then at the report's last tick, until drawAt.
    apply(report: TickReport) {
        this.lastTick = report.lastTick;
        this.removeAll(report.removed);
        this.setPaths(report);

        const before = this.moves;
        this.moves = this.movesIn(report.poses);
        // A body that moved last time but not now stops where the last report put it.
        for (const [id, move] of before) {
            if (!this.moves.has(id) && this.copy.bodyMatrices.entityOf(id) === move.entity) {
                this.place(move.entity, move.to);
            }
        }
        for (const move of this.moves.values()) {
            this.place(move.entity, move.to);
        }

        this.cameraFrom = this.cameraTo;
        this.cameraTo = report.camera;
        this.drawnCamera = report.camera;
    }

    // Places each moved body and the camera this far from their last pose to their new one: 0 is where
    // they were, 1 where the last report put them. A snapped body is always at its new pose.
    drawAt(interpolation: number) {
        const along = Math.min(Math.max(interpolation, 0), 1);
        const moving = new Set<Entity>();

        for (const move of this.moves.values()) {
            const pose = move.snap ? move.to : between(move.from, move.to, along);
            this.place(move.entity, pose);
            moving.add(move.entity);
        }
        this.followPaths(moving);

        this.drawnCamera = {
            x: this.cameraFrom.x + (this.cameraTo.x - this.cameraFrom.x) * along,
            y: this.cameraFrom.y + (this.cameraTo.y - this.cameraFrom.y) * along,
        };
    }

    // Stops the caches following the mirror's level. The mirror is not used after.
    destroy() {
        this.copy.caches.dispose();
    }

    private movesIn(poses: Float64Array) {
        const moves = new Map<EntityId, BodyMove>();

        for (let offset = 0; offset + POSE_STRIDE <= poses.length; offset += POSE_STRIDE) {
            const id = poses[offset] ?? NaN;
            const entity = this.copy.bodyMatrices.entityOf(id);
            const from = this.copy.poses.poseOf(id);
            if (entity === undefined || from === undefined) continue;

            const to = { x: poses[offset + 1] ?? NaN, y: poses[offset + 2] ?? NaN, angle: poses[offset + 3] ?? NaN };
            // The last pose reached, not one drawn part of the way to it.
            const reached = this.moves.get(id)?.to ?? from;
            moves.set(id, { entity, from: reached, to, snap: poses[offset + 4] === 1 });
        }

        return moves;
    }

    private place(body: Entity, pose: BodyPose) {
        this.copy.poses.place(body.id, pose);
        this.copy.caches.bodyMoved(body);
        this.placed.emit(body);
        for (const follower of this.copy.bodyMatrices.followersOf(body)) {
            this.copy.caches.bodyMoved(follower);
            this.placed.emit(follower);
        }
    }

    private setPaths(report: TickReport) {
        for (const { entity, path } of report.paths) {
            this.level.findEntity(entity)?.getComponent(PathComponent)?.set('path', path);
        }
    }

    // Keeps each Rope and Spring on its ends while its bodies are drawn between ticks, with the code the
    // play copy uses, so at 1 the path is the report's.
    private followPaths(moving: ReadonlySet<Entity>) {
        if (moving.size === 0) return;

        for (const joint of this.copy.joints.attachedToAny(moving)) {
            const path = jointPathOf(joint, this.copy.caches.worldMatrices, this.copy.bodyMatrices);
            if (path === undefined) continue;

            joint.entity.getComponent(PathComponent)?.set('path', path);
        }
    }

    // Each removed entity goes with everything inside it, its bodies and the joints in it, as in the play copy.
    private removeAll(removed: readonly EntityId[]) {
        for (const id of removed) {
            const top = this.level.findEntity(id);
            if (top === undefined) continue;

            this.forgetInside(top);
            this.level.removeEntity(top);
        }
    }

    private forgetInside(top: Entity) {
        const waiting = [top];

        for (let entity = waiting.pop(); entity !== undefined; entity = waiting.pop()) {
            waiting.push(...entity.children);

            const joint = this.copy.joints.find(entity);
            if (joint !== undefined) {
                this.copy.joints.remove(joint);
            }

            if (this.copy.bodyMatrices.remove(entity) === undefined) continue;

            this.copy.poses.forget(entity.id);
            this.moves.delete(entity.id);
        }
    }
}

// The pose this far from one to the other: the position the straight way, the angle the shorter way round.
function between(from: BodyPose, to: BodyPose, along: number): BodyPose {
    if (along === 1) return to;

    return {
        x: from.x + (to.x - from.x) * along,
        y: from.y + (to.y - from.y) * along,
        angle: from.angle + shorterTurn(from.angle, to.angle) * along,
    };
}

// The turn from one angle to the other in degrees, between -180 and 180.
function shorterTurn(from: number, to: number) {
    const turn = (to - from) % 360;
    if (turn > 180) return turn - 360;
    if (turn < -180) return turn + 360;

    return turn;
}
