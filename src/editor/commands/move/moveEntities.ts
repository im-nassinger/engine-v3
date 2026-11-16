import { Level } from '../../../core/level/index.ts';
import type { Entity, EntityId } from '../../../core/level/index.ts';
import { countBodyChanges } from '../../../core/physics/index.ts';
import { MoveEntityChange } from '../../history/index.ts';
import type { EditOutcome, EditTransaction, TreePlace } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';
import type { Question } from '../EditorCommand.ts';
import { bodyQuestion } from '../shared/bodyQuestion.ts';
import { heightBelow } from '../shared/heightBelow.ts';
import { inPanelOrder } from '../shared/inPanelOrder.ts';
import { transformUnder, transformValuesOf } from '../shared/keepInPlace.ts';
import { stepLabel } from '../shared/stepLabel.ts';

const TOO_DEEP = `Groups can be at most ${Level.maxDepth} deep`;

// A move that changes which body an entity belongs to asks first; confirm() makes it.
export type MoveOutcome =
    EditOutcome | { readonly kind: 'needsConfirmation'; readonly question: Question; confirm(): EditOutcome };

// A drop in the Entities panel: the dragged entities land side by side in their panel order, from the
// target's index, each kept in place on screen, in one step. The target's index counts the parent's
// children as they are before the move, the dragged ones included. A dragged entity inside another
// dragged one moves with it. Dropping where they already are makes no step. A move that changes the body
// any of them moves with in play asks first, and Cancel changes nothing.
export function moveEntities(openLevel: OpenLevel, entityIds: readonly EntityId[], target: TreePlace): MoveOutcome {
    const planned = planMove(openLevel.level, entityIds, target);
    if (planned.kind !== 'planned') return planned;

    const moves = planned.plan.moved.map((entity) => ({ entity, newParent: planned.plan.parent }));
    const bodyChanges = countBodyChanges(moves);
    if (bodyChanges === 0) return makeMove(openLevel, planned.plan);

    // Planned again on OK, from the level as it is then.
    const confirm = () => moveWithoutAsking(openLevel, entityIds, target);

    return { kind: 'needsConfirmation', question: bodyQuestion(bodyChanges), confirm };
}

function moveWithoutAsking(openLevel: OpenLevel, entityIds: readonly EntityId[], target: TreePlace): EditOutcome {
    const planned = planMove(openLevel.level, entityIds, target);
    if (planned.kind !== 'planned') return planned;

    return makeMove(openLevel, planned.plan);
}

type Planned = EditOutcome | { readonly kind: 'planned'; readonly plan: MovePlan };

function planMove(level: Level, entityIds: readonly EntityId[], target: TreePlace): Planned {
    const parent = level.requireEntity(target.parentId);
    const moved = outermostInPanelOrder(level, entityIds);

    const refusal = refusalReason(level, moved, parent);
    if (refusal !== undefined) return { kind: 'refused', reason: refusal };

    const anchor = firstStayingSibling(parent, target.index, moved);
    if (isAlreadyThere(parent, moved, anchor)) return { kind: 'done' };

    return { kind: 'planned', plan: { parent, moved, anchor } };
}

function makeMove(openLevel: OpenLevel, plan: MovePlan) {
    const label = stepLabel('Move', plan.moved);

    return openLevel.editor.edit(label, (transaction) => {
        moveBeforeAnchor(openLevel, transaction, plan);

        return { kind: 'done', selectAfter: plan.moved.map((entity) => entity.id) };
    });
}

type MovePlan = {
    readonly parent: Entity;
    readonly moved: readonly Entity[];
    // The first child that doesn't move, at or after the target's index; undefined lands them last.
    readonly anchor: Entity | undefined;
};

// Every level matrix is read before anything moves. The parent's stays as it is, since nothing inside a
// dragged entity can be the parent. Each one goes just before the anchor, so they end up in order.
function moveBeforeAnchor(openLevel: OpenLevel, transaction: EditTransaction, plan: MovePlan) {
    const { worldMatrices } = openLevel.caches;
    const parentMatrix = worldMatrices.matrixOf(plan.parent);
    const movedMatrices = plan.moved.map((entity) => worldMatrices.matrixOf(entity));

    plan.moved.forEach((entity, movedIndex) => {
        const entityMatrix = movedMatrices[movedIndex];
        const oldParent = entity.parent;
        if (entityMatrix === undefined || oldParent === undefined) {
            throw new Error(`Entity ${entity.id} can't be moved.`);
        }

        const change = new MoveEntityChange({
            entityId: entity.id,
            oldPlace: { parentId: oldParent.id, index: oldParent.children.indexOf(entity) },
            newPlace: { parentId: plan.parent.id, index: indexBeforeAnchor(plan.parent, entity, plan.anchor) },
            oldTransform: transformValuesOf(entity),
            newTransform: transformUnder(parentMatrix, entityMatrix),
        });
        transaction.apply(change);
    });
}

// The index among the siblings once the entity has moved: it no longer counts itself.
function indexBeforeAnchor(parent: Entity, entity: Entity, anchor: Entity | undefined) {
    const ownIndex = entity.parent === parent ? parent.children.indexOf(entity) : -1;
    const isAmongSiblings = ownIndex !== -1;
    const anchorIndex = anchor === undefined ? parent.children.length : parent.children.indexOf(anchor);
    const countsItself = isAmongSiblings && ownIndex < anchorIndex;

    return countsItself ? anchorIndex - 1 : anchorIndex;
}

function outermostInPanelOrder(level: Level, entityIds: readonly EntityId[]) {
    const entities = entityIds.map((id) => level.requireEntity(id));
    const outermost = entities.filter((entity) => !entities.some((other) => other.isAncestorOf(entity)));

    return inPanelOrder(level, outermost);
}

function refusalReason(level: Level, moved: readonly Entity[], parent: Entity) {
    if (moved.length === 0) return 'Nothing to move';

    for (const entity of moved) {
        if (entity === level.world) return "The World can't be moved";

        const isCameraOutsideWorld = entity === level.camera && parent !== level.world;
        if (isCameraOutsideWorld) return 'The camera stays directly in the World';

        const isIntoItself = entity === parent || entity.isAncestorOf(parent);
        if (isIntoItself) return "An entity can't go inside itself";

        const deepestAfter = parent.depth + 1 + heightBelow(entity);
        if (deepestAfter > Level.maxDepth) return TOO_DEEP;
    }

    return undefined;
}

function firstStayingSibling(parent: Entity, index: number, moved: readonly Entity[]) {
    const isMoved = new Set(moved);
    const siblingsFromIndex = parent.children.slice(index);

    return siblingsFromIndex.find((sibling) => !isMoved.has(sibling));
}

// All already in the parent, side by side in their panel order, ending just before the anchor.
function isAlreadyThere(parent: Entity, moved: readonly Entity[], anchor: Entity | undefined) {
    const allInParent = moved.every((entity) => entity.parent === parent);
    if (!allInParent) return false;

    const anchorIndex = anchor === undefined ? parent.children.length : parent.children.indexOf(anchor);
    const firstIndex = anchorIndex - moved.length;

    return moved.every((entity, movedIndex) => parent.children.indexOf(entity) === firstIndex + movedIndex);
}
