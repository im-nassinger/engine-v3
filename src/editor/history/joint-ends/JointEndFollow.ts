import { JointComponent, PathComponent, TransformComponent } from '../../../core/components/index.ts';
import type { AnyComponentSchema, JointType } from '../../../core/components/index.ts';
import { Matrix2D } from '../../../core/geometry/index.ts';
import type { JointEnds, PathGeometry, Point } from '../../../core/geometry/index.ts';
import type { Entity, EntityId, Level } from '../../../core/level/index.ts';
import { jointPathPoints } from '../../../core/physics/index.ts';

import { SetValueChange } from '../changes/index.ts';

type TwoEndedType = Exclude<JointType, 'hinge'>;

// A Rope or Spring as it was when the edit began, with what its ends were attached to.
type WatchedJoint = {
    readonly jointId: EntityId;
    readonly type: TwoEndedType;
    readonly endA: WatchedEnd;
    readonly endB: WatchedEnd;
    readonly startPosition: Point;
    readonly startEnds: JointEnds;
    readonly startPath: PathGeometry;
    // The joint's own space to level positions when the edit began.
    readonly startJointMatrix: Matrix2D;
    // The joint, the joined entities and all their parents: moving any of them moves an end.
    readonly moverIds: readonly EntityId[];
};

type WatchedEnd = {
    // Undefined for an empty B, pinned to the background, which never moves.
    readonly bodyId: EntityId | undefined;
    readonly startBodyMatrix: Matrix2D | undefined;
    // The end in level positions.
    readonly startPosition: Point;
};

// The values a joint is given so its ends stay on its bodies.
type FollowedValues = {
    readonly position: Point;
    readonly ends: JointEnds;
    readonly path: PathGeometry;
};

// Keeps each Rope's and Spring's ends on the entities it joins, and the joint at its end A (owner,
// 2026-11-21): when an edit moves, turns or resizes one of them, or a group holding one, the end attached
// to it moves with it. Moving the joint itself moves its end A only; end B stays where it is. Either way the
// joint is put back on end A and its path is drawn again from A to B. Taken when an edit begins; the edit
// then adds the changes it gives, so they undo with it.
export class JointEndFollow {
    private readonly watched: readonly WatchedJoint[];
    // Each entity whose move moves an end: the joined entities and their parents, to the joints that follow it.
    private readonly jointsByMover: ReadonlyMap<EntityId, readonly WatchedJoint[]>;
    // During a drag: the position each joint was last given here. Any other position was written by the
    // drag itself, moving the joint, and is the joint's own from then on.
    private readonly writtenPositions = new Map<EntityId, Point>();
    private readonly ownPositions = new Map<EntityId, Point>();

    private constructor(watched: readonly WatchedJoint[]) {
        this.watched = watched;
        this.jointsByMover = jointsByMoverOf(watched);
    }

    static watch(level: Level) {
        const watched: WatchedJoint[] = [];

        for (const entity of level.entitiesInPanelOrder()) {
            const joint = watchedJointOf(level, entity);
            if (joint === undefined) continue;

            watched.push(joint);
        }

        return new JointEndFollow(watched);
    }

    get isEmpty() {
        return this.watched.length === 0;
    }

    // Whether moving this entity can move a watched joint's end.
    moves(entityId: EntityId) {
        return this.jointsByMover.has(entityId);
    }

    // The changes that put every watched joint whose joined entities moved back on them, from the values
    // the joints hold now. Applying them in order follows the edit.
    changes(level: Level): SetValueChange[] {
        const changes: SetValueChange[] = [];

        for (const watched of this.watched) {
            const joint = level.findEntity(watched.jointId);
            if (joint === undefined) continue;

            const position = joint.requireComponent(TransformComponent).get('position');
            const followed = followedValuesOf(level, joint, watched, position);
            if (followed === undefined) continue;

            changes.push(...changesTo(joint, followed));
        }

        return changes;
    }

    // During a drag: the changes for the joints this entity's move can move (itself among them), from the values the joints
    // hold now to where they follow it. Computed from the start each time, so a body dragged back puts its
    // joints back as they were.
    changesFollowing(level: Level, entityId: EntityId): SetValueChange[] {
        const joints = this.jointsByMover.get(entityId) ?? [];
        const changes: SetValueChange[] = [];

        for (const watched of joints) {
            const joint = level.findEntity(watched.jointId);
            if (joint === undefined) continue;

            const ownPosition = this.ownPositionOf(joint, watched);
            const followed =
                followedValuesOf(level, joint, watched, ownPosition) ?? startValuesOf(watched, ownPosition);
            this.writtenPositions.set(joint.id, followed.position);
            changes.push(...changesTo(joint, followed));
        }

        return changes;
    }

    // During a drag: the changes from each watched joint's start values to the values it holds now, for
    // the drag's one step.
    changesSinceStart(level: Level): SetValueChange[] {
        const changes: SetValueChange[] = [];

        for (const watched of this.watched) {
            const joint = level.findEntity(watched.jointId);
            if (joint === undefined) continue;

            changes.push(...changesFrom(joint, watched));
        }

        return changes;
    }

    // Esc during a drag: every watched joint back to its start values.
    restore(level: Level) {
        for (const watched of this.watched) {
            const joint = level.findEntity(watched.jointId);
            if (joint === undefined) continue;

            const changes = changesTo(joint, startValuesOf(watched, watched.startPosition));
            for (const change of changes) {
                change.apply(level);
            }
        }
    }

    private ownPositionOf(joint: Entity, watched: WatchedJoint) {
        const position = joint.requireComponent(TransformComponent).get('position');
        const written = this.writtenPositions.get(joint.id);
        const movedByTheDrag = written === undefined || written.x !== position.x || written.y !== position.y;
        if (movedByTheDrag) {
            this.ownPositions.set(joint.id, position);
        }

        return this.ownPositions.get(joint.id) ?? watched.startPosition;
    }
}

function watchedJointOf(level: Level, entity: Entity): WatchedJoint | undefined {
    const joint = entity.getComponent(JointComponent);
    const path = entity.getComponent(PathComponent);
    const transform = entity.getComponent(TransformComponent);
    if (joint === undefined || path === undefined || transform === undefined) return undefined;

    const type = joint.get('type');
    if (type === 'hinge') return undefined;

    const jointMatrix = levelMatrixOf(entity);
    const ends = joint.get('ends');
    const moverIds = [
        ...withParentsOf(level, entity.id),
        ...withParentsOf(level, joint.get('a')),
        ...withParentsOf(level, joint.get('b')),
    ];

    return {
        jointId: entity.id,
        type,
        endA: watchedEndOf(level, joint.get('a'), jointMatrix.apply(ends.a)),
        endB: watchedEndOf(level, joint.get('b'), jointMatrix.apply(ends.b)),
        startPosition: transform.get('position'),
        startEnds: ends,
        startPath: path.get('path'),
        startJointMatrix: jointMatrix,
        moverIds,
    };
}

function withParentsOf(level: Level, entityId: EntityId | null) {
    const ids: EntityId[] = [];
    let current = entityId === null ? undefined : level.findEntity(entityId);

    while (current !== undefined) {
        ids.push(current.id);
        current = current.parent;
    }

    return ids;
}

function watchedEndOf(level: Level, bodyId: EntityId | null, startPosition: Point): WatchedEnd {
    const body = bodyId === null ? undefined : level.findEntity(bodyId);
    if (body === undefined) return { bodyId: undefined, startBodyMatrix: undefined, startPosition };

    return { bodyId: body.id, startBodyMatrix: levelMatrixOf(body), startPosition };
}

function jointsByMoverOf(watched: readonly WatchedJoint[]) {
    const jointsByMover = new Map<EntityId, WatchedJoint[]>();

    for (const joint of watched) {
        for (const moverId of new Set(joint.moverIds)) {
            const joints = jointsByMover.get(moverId) ?? [];
            joints.push(joint);
            jointsByMover.set(moverId, joints);
        }
    }

    return jointsByMover;
}

function bodyMatrixNow(level: Level, end: WatchedEnd) {
    if (end.bodyId === undefined) return undefined;

    const body = level.findEntity(end.bodyId);
    if (body === undefined) return undefined;

    return levelMatrixOf(body);
}

function hasMoved(level: Level, end: WatchedEnd) {
    const start = end.startBodyMatrix;
    const now = bodyMatrixNow(level, end);
    if (start === undefined || now === undefined) return false;

    return !sameMatrix(start, now);
}

function anEndMoved(level: Level, watched: WatchedJoint) {
    return hasMoved(level, watched.endA) || hasMoved(level, watched.endB);
}

function sameMatrix(first: Matrix2D, second: Matrix2D) {
    const sameLinear = first.a === second.a && first.b === second.b && first.c === second.c && first.d === second.d;

    return sameLinear && first.tx === second.tx && first.ty === second.ty;
}

// Where an end is now in level positions, carried by its entity if that moved, else where `unmoved` puts it.
function endPositionNow(level: Level, end: WatchedEnd, unmoved: () => Point) {
    const start = end.startBodyMatrix;
    const now = bodyMatrixNow(level, end);
    const followsBody = start !== undefined && now !== undefined && !sameMatrix(start, now);
    if (!followsBody) return unmoved();

    const startInverse = start.invert();
    if (startInverse === undefined) return unmoved();

    const onBody = startInverse.apply(end.startPosition);

    return now.apply(onBody);
}

// Undefined when neither a joined entity nor the joint moved, or a matrix can't be inverted. End A, when
// its entity didn't move, goes where the joint at its own position puts it; end B stays where it was.
function followedValuesOf(
    level: Level,
    joint: Entity,
    watched: WatchedJoint,
    ownPosition: Point,
): FollowedValues | undefined {
    let parentMatrix = Matrix2D.identity();
    if (joint.parent !== undefined) {
        parentMatrix = levelMatrixOf(joint.parent);
    }

    const transform = joint.requireComponent(TransformComponent);
    const jointMatrix = jointMatrixAt(transform, parentMatrix, ownPosition);
    const jointMoved = !sameMatrix(jointMatrix, watched.startJointMatrix);
    if (!jointMoved && !anEndMoved(level, watched)) return undefined;

    const parentInverse = parentMatrix.invert();
    if (parentInverse === undefined) return undefined;

    const endA = endPositionNow(level, watched.endA, () => jointMatrix.apply(watched.startEnds.a));
    const endB = endPositionNow(level, watched.endB, () => watched.endB.startPosition);

    const position = parentInverse.apply(endA);
    const placedInverse = jointMatrixAt(transform, parentMatrix, position).invert();
    if (placedInverse === undefined) return undefined;

    // The joint's origin is end A by where it was just put.
    const ends = { a: { x: 0, y: 0 }, b: placedInverse.apply(endB) };
    const path = jointPathPoints(watched.type, ends.a, ends.b);

    return { position, ends, path };
}

function jointMatrixAt(transform: TransformComponent, parentMatrix: Matrix2D, position: Point) {
    const ownMatrix = Matrix2D.fromTransform({
        position,
        rotation: transform.get('rotation'),
        scale: transform.get('scale'),
        skew: transform.get('skew'),
    });

    return parentMatrix.multiply(ownMatrix);
}

// The ends and path as they began, at this position.
function startValuesOf(watched: WatchedJoint, position: Point): FollowedValues {
    return { position, ends: watched.startEnds, path: watched.startPath };
}

function changesTo(joint: Entity, values: FollowedValues) {
    const changes = [
        valueChange(joint, TransformComponent.schema, 'position', values.position),
        valueChange(joint, JointComponent.schema, 'ends', values.ends),
        valueChange(joint, PathComponent.schema, 'path', values.path),
    ];

    return changes.filter((change) => change !== undefined);
}

function changesFrom(joint: Entity, watched: WatchedJoint) {
    const changes = [
        valueChangeSince(joint, TransformComponent.schema, 'position', watched.startPosition),
        valueChangeSince(joint, JointComponent.schema, 'ends', watched.startEnds),
        valueChangeSince(joint, PathComponent.schema, 'path', watched.startPath),
    ];

    return changes.filter((change) => change !== undefined);
}

// From the value the joint holds now to this one, or undefined when they are equal.
function valueChange(joint: Entity, schema: AnyComponentSchema, key: string, newValue: unknown) {
    const oldValue = currentValueOf(joint, schema, key);
    if (equalValues(schema, key, oldValue, newValue)) return undefined;

    return new SetValueChange({ entityId: joint.id, schema, key, oldValue, newValue });
}

// From this value to the one the joint holds now, or undefined when they are equal.
function valueChangeSince(joint: Entity, schema: AnyComponentSchema, key: string, oldValue: unknown) {
    const newValue = currentValueOf(joint, schema, key);
    if (equalValues(schema, key, oldValue, newValue)) return undefined;

    return new SetValueChange({ entityId: joint.id, schema, key, oldValue, newValue });
}

function currentValueOf(joint: Entity, schema: AnyComponentSchema, key: string) {
    const component = joint.components.find((candidate) => candidate.schema === schema);
    if (component === undefined) throw new Error(`The joint has no ${schema.typeName}.`);

    return component.readValue(key);
}

function equalValues(schema: AnyComponentSchema, key: string, first: unknown, second: unknown) {
    const entry = schema.findEntry(key);
    if (entry === undefined) throw new Error(`${schema.typeName} has no value ${key}.`);

    return entry.type.equals(first, second);
}

// The entity's own space to level positions, worked out from the TransformComponents up its parents, so
// it is right in the middle of an edit, before any cache hears of it.
function levelMatrixOf(entity: Entity): Matrix2D {
    const transform = entity.getComponent(TransformComponent);
    let ownMatrix = Matrix2D.identity();
    if (transform !== undefined) {
        ownMatrix = Matrix2D.fromTransform({
            position: transform.get('position'),
            rotation: transform.get('rotation'),
            scale: transform.get('scale'),
            skew: transform.get('skew'),
        });
    }

    const parent = entity.parent;
    if (parent === undefined) return ownMatrix;

    const parentMatrix = levelMatrixOf(parent);

    return parentMatrix.multiply(ownMatrix);
}
