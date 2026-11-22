import { JointComponent, NameComponent, PathComponent, TransformComponent } from '../../../core/components/index.ts';
import type { AnyComponent, JointType } from '../../../core/components/index.ts';
import type { JointEnds, Point } from '../../../core/geometry/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { EntityId } from '../../../core/level/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import type { LevelReader } from '../../../core/level-data/index.ts';
import { drawnLength, jointPathPoints } from '../../../core/physics/index.ts';
import { AddEntitiesChange } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';
import { EntityNamer } from '../shared/EntityNamer.ts';

const LOCKED = 'This group is locked';
const TOO_DEEP = `Groups can be at most ${Level.maxDepth} deep`;
const FLAT_GROUP = 'This group is scaled to 0';

const TYPE_WORDS: Readonly<Record<JointType, string>> = {
    hinge: 'Hinge',
    rope: 'Rope',
    spring: 'Spring',
};

const ORIGIN: Point = { x: 0, y: 0 };

// What the Joint tool placed, in level positions: a Hinge's one point, or a Rope or Spring's two ends. An
// empty B pins A to the background.
export type JointPlacement =
    | { readonly type: 'hinge'; readonly a: EntityId; readonly b: EntityId | null; readonly at: Point }
    | {
          readonly type: 'rope' | 'spring';
          readonly a: EntityId;
          readonly b: EntityId | null;
          readonly endA: Point;
          readonly endB: Point;
      };

export type PlaceJointOutcome =
    { readonly kind: 'placed'; readonly id: EntityId } | { readonly kind: 'refused'; readonly reason: string };

// The plan's CreateJointCommand: a new joint in the current group, on top, named "Hinge 1" and selected,
// in one step "Place Hinge 1". It sits at the hinge point or halfway between the ends, unrotated at a scale
// of 1 in the group's space, with its ends in its own space. An edit, not a registered command, since only
// the Joint tool runs it, like createShape. Refused inside a locked group, one as deep as a level goes, or
// one scaled to 0, where no click has a place.
export function placeJoint(openLevel: OpenLevel, reader: LevelReader, placement: JointPlacement): PlaceJointOutcome {
    const { level, editor, currentGroup, caches } = openLevel;
    const group = currentGroup.group;
    if (caches.hidden.isLocked(group)) return { kind: 'refused', reason: LOCKED };
    if (group.depth + 1 > Level.maxDepth) return { kind: 'refused', reason: TOO_DEEP };
    const toGroup = caches.worldMatrices.matrixOf(group).invert();
    if (toGroup === undefined) return { kind: 'refused', reason: FLAT_GROUP };

    const name = new EntityNamer(level).nextName(TYPE_WORDS[placement.type]);
    const id = level.allocateId();
    const components = jointComponents(placement, name, (point) => toGroup.apply(point));
    const data = new LevelWriter().writeNewEntity(id, components);
    const place = { parentId: group.id, index: 0 };

    const outcome = editor.edit(`Place ${name}`, (transaction) => {
        transaction.apply(new AddEntitiesChange({ reader, entities: [data], place }));

        return { kind: 'done', selectAfter: [id] };
    });
    if (outcome.kind === 'refused') return outcome;

    return { kind: 'placed', id };
}

function jointComponents(placement: JointPlacement, name: string, toGroup: (point: Point) => Point): AnyComponent[] {
    const defaults = JointComponent.schema.defaults();
    const links = { a: placement.a, b: placement.b };

    if (placement.type === 'hinge') {
        const ends = { a: ORIGIN, b: ORIGIN };
        const joint = new JointComponent({ ...defaults, ...links, type: 'hinge', ends });

        return [transformAt(toGroup(placement.at)), new NameComponent({ name }), joint];
    }

    const endA = toGroup(placement.endA);
    const endB = toGroup(placement.endB);
    // A Rope or Spring sits at its end A, so its icon is where it starts (owner, 2026-11-21).
    const ends: JointEnds = { a: ORIGIN, b: { x: endB.x - endA.x, y: endB.y - endA.y } };
    const gap = drawnLength(ends);
    const joint = new JointComponent({
        ...defaults,
        ...links,
        type: placement.type,
        // A Rope or Spring acts at a distance, so its two bodies may touch.
        letConnectedObjectsCollide: true,
        matchDrawnDistance: true,
        length: gap,
        restLength: gap,
        ends,
    });
    const path = new PathComponent({ path: jointPathPoints(placement.type, ends.a, ends.b) });

    return [transformAt(endA), new NameComponent({ name }), joint, path];
}

function transformAt(position: Point) {
    return new TransformComponent({ position, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 });
}
