import { NameComponent, TransformComponent } from '../../../core/components/index.ts';
import { Bounds, Matrix2D } from '../../../core/geometry/index.ts';
import type { Point, TransformValues } from '../../../core/geometry/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import { AddEntitiesChange, MoveEntityChange } from '../../history/index.ts';
import type { EditTransaction } from '../../history/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';
import { EntityNamer } from '../shared/EntityNamer.ts';
import { inPanelOrder } from '../shared/inPanelOrder.ts';
import { transformUnder, transformValuesOf } from '../shared/keepInPlace.ts';
import { skipEntities } from '../shared/skipEntities.ts';
import type { SkipResult } from '../shared/skipEntities.ts';
import { stepLabel } from '../shared/stepLabel.ts';

const DRAW_ORDER_CHANGED = 'Draw order changed';
const TOO_DEEP = `Groups can be at most ${Level.maxDepth} deep`;

// Where the new group goes and what it holds, worked out before the level changes.
type GroupPlan = {
    readonly members: readonly Entity[];
    readonly parent: Entity;
    readonly index: number;
    readonly groupTransform: TransformValues;
};

// Puts the selection into a new group where the frontmost selected entity was, each entity kept in place
// on screen. The World and the camera are skipped.
export class GroupCommand implements EditorCommand {
    readonly id = 'arrange.group';
    readonly label = 'Group';
    readonly menu = { menu: 'Arrange', section: 1, order: 10 } as const;
    readonly shortcuts = ['Ctrl+G'];
    private readonly session: EditorSession;

    constructor(session: EditorSession) {
        this.session = session;
    }

    availability(): Availability {
        const split = this.splitSelection();
        const refusal = refusalReason(split);
        if (refusal !== undefined) return { enabled: false, reason: refusal };

        return { enabled: true };
    }

    run(): CommandOutcome {
        const split = this.splitSelection();
        const refusal = refusalReason(split);
        if (refusal !== undefined) return { kind: 'refused', reason: refusal };

        const { level, editor } = this.session.openLevel;
        const members = inPanelOrder(level, split.allowed);
        if (!fitsInDepth(members)) return { kind: 'refused', reason: TOO_DEEP };

        const plan = this.planGroup(members);
        const changedDrawOrder = !isOneRunOfRows(members);
        const label = stepLabel('Group', members);

        const outcome = editor.edit(label, (transaction) => {
            const group = this.addGroup(transaction, plan);
            this.moveMembersInto(transaction, group, plan.members);

            return { kind: 'done', selectAfter: [group.id], skipped: split.skipped };
        });
        if (outcome.kind === 'refused') return outcome;

        if (changedDrawOrder) return { ...outcome, text: DRAW_ORDER_CHANGED };

        return outcome;
    }

    // The group sits in the frontmost entity's parent, at its row. Its origin is the centre of what the
    // members draw, seen from that parent, with no rotation, a scale of 1 and no skew.
    private planGroup(members: readonly Entity[]): GroupPlan {
        const frontmost = members[0];
        const parent = frontmost?.parent;
        if (frontmost === undefined || parent === undefined) {
            throw new Error('Group needs a member with a parent.');
        }

        const centre = this.centreOf(members);
        const parentMatrix = this.session.openLevel.caches.worldMatrices.matrixOf(parent);
        const centreMatrix = new Matrix2D(1, 0, 0, 1, centre.x, centre.y);
        const centreInParent = transformUnder(parentMatrix, centreMatrix).position;

        const groupTransform = { position: centreInParent, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 };
        const index = parent.children.indexOf(frontmost);

        return { members, parent, index, groupTransform };
    }

    // A member that draws nothing counts as its origin.
    private centreOf(members: readonly Entity[]): Point {
        const { bounds, worldMatrices } = this.session.openLevel.caches;
        let union: Bounds | undefined;

        for (const member of members) {
            let memberBounds = bounds.subtreeBoundsOf(member);
            if (memberBounds === undefined) {
                const origin = worldMatrices.matrixOf(member).apply({ x: 0, y: 0 });
                memberBounds = new Bounds(origin.x, origin.y, origin.x, origin.y);
            }

            union = union === undefined ? memberBounds : union.union(memberBounds);
        }

        if (union === undefined) throw new Error('Group needs at least one member.');

        return union.centre;
    }

    private addGroup(transaction: EditTransaction, plan: GroupPlan) {
        const { level } = this.session.openLevel;
        const name = new EntityNamer(level).nextName('Group');
        const components = [new TransformComponent(plan.groupTransform), new NameComponent({ name })];

        const groupId = level.allocateId();
        const groupData = new LevelWriter().writeNewEntity(groupId, plan.parent.id, components);
        const place = { parentId: plan.parent.id, index: plan.index };
        const change = new AddEntitiesChange({ reader: this.session.reader, entities: [groupData], place });
        transaction.apply(change);

        return level.requireEntity(groupId);
    }

    // Every level matrix is read before anything moves, since a member's own parent can be another
    // member's parent too.
    private moveMembersInto(transaction: EditTransaction, group: Entity, members: readonly Entity[]) {
        const { worldMatrices } = this.session.openLevel.caches;
        const groupMatrix = worldMatrices.matrixOf(group);
        const memberMatrices = members.map((member) => worldMatrices.matrixOf(member));

        members.forEach((member, memberIndex) => {
            const memberMatrix = memberMatrices[memberIndex];
            const oldParent = member.parent;
            if (memberMatrix === undefined || oldParent === undefined) {
                throw new Error(`Entity ${member.id} can't be grouped.`);
            }

            const change = new MoveEntityChange({
                entityId: member.id,
                oldPlace: { parentId: oldParent.id, index: oldParent.children.indexOf(member) },
                newPlace: { parentId: group.id, index: memberIndex },
                oldTransform: transformValuesOf(member),
                newTransform: transformUnder(groupMatrix, memberMatrix),
            });
            transaction.apply(change);
        });
    }

    private splitSelection() {
        const { level, selection } = this.session.openLevel;

        return skipEntities(level, selection.entities, ['world', 'camera']);
    }
}

function refusalReason(split: SkipResult) {
    if (split.allowed.length > 0) return undefined;

    const skippedKinds = split.skipped.map((entity) => entity.kind);
    if (skippedKinds.includes('world')) return "The World can't be grouped";
    if (skippedKinds.includes('camera')) return "The camera can't be grouped";

    return 'Nothing selected';
}

// The group goes one deeper than the frontmost member, and every member, with what is inside it, one
// below the group.
function fitsInDepth(members: readonly Entity[]) {
    const groupDepth = members[0]?.depth ?? 0;

    for (const member of members) {
        const deepestAfter = groupDepth + 1 + heightBelow(member);
        if (deepestAfter > Level.maxDepth) return false;
    }

    return true;
}

// How many levels of children sit below the entity: 0 for an entity without children.
function heightBelow(entity: Entity): number {
    let height = 0;

    for (const child of entity.children) {
        const childHeight = 1 + heightBelow(child);
        height = Math.max(height, childHeight);
    }

    return height;
}

// One unbroken run of rows in one group: the draw order stays as it was.
function isOneRunOfRows(members: readonly Entity[]) {
    const parent = members[0]?.parent;
    if (parent === undefined) return false;

    const indexes: number[] = [];
    for (const member of members) {
        if (member.parent !== parent) return false;

        indexes.push(parent.children.indexOf(member));
    }

    return indexes.every((index, position) => index === (indexes[0] ?? 0) + position);
}
