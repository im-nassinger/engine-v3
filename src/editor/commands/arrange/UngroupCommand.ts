import { NameComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Entity, EntityId } from '../../../core/level/index.ts';
import { MoveEntityChange, RemoveEntitiesChange } from '../../history/index.ts';
import type { EditTransaction } from '../../history/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';
import { attachedJoints } from '../shared/attachedJoints.ts';
import { inPanelOrder } from '../shared/inPanelOrder.ts';
import { transformUnder, transformValuesOf } from '../shared/keepInPlace.ts';
import { skipEntities } from '../shared/skipEntities.ts';
import { labelName, stepLabel } from '../shared/stepLabel.ts';

const NOTHING_TO_UNGROUP = 'Nothing to ungroup';

// Every component a group can hold without the status bar saying it was removed with it.
const UNREPORTED_COMPONENTS = new Set([TransformComponent.schema.typeName, NameComponent.schema.typeName]);

// What one ungrouping removed besides the group itself, for the status bar.
type RemovedWithGroups = {
    readonly componentNames: Set<string>;
    readonly jointNames: string[];
};

// Puts each selected group's children in its place in its parent, kept in place on screen and selected,
// and removes the group with its components and the joints attached to it. The World and the camera are
// skipped, and so is an entity without children.
export class UngroupCommand implements EditorCommand {
    readonly id = 'arrange.ungroup';
    readonly label = 'Ungroup';
    readonly menu = { menu: 'Arrange', section: 1, order: 20 } as const;
    readonly shortcuts = ['Ctrl+Shift+G'];
    private readonly session: EditorSession;

    constructor(session: EditorSession) {
        this.session = session;
    }

    availability(): Availability {
        const groups = this.selectedGroups();
        if (groups.length === 0) return { enabled: false, reason: NOTHING_TO_UNGROUP };

        return { enabled: true };
    }

    run(): CommandOutcome {
        const groups = this.selectedGroups();
        if (groups.length === 0) return { kind: 'refused', reason: NOTHING_TO_UNGROUP };

        const { level, selection, editor } = this.session.openLevel;
        const groupSet = new Set(groups);
        const keptSelected = selection.entities.filter((entity) => !groupSet.has(entity));
        const label = stepLabel('Ungroup', groups);
        const removed: RemovedWithGroups = { componentNames: new Set(), jointNames: [] };

        const outcome = editor.edit(label, (transaction) => {
            const freedIds: EntityId[] = [];

            for (const group of groups) {
                // A group can be the end of a joint another group in the selection held.
                const isStillInLevel = level.findEntity(group.id) === group;
                if (!isStillInLevel) continue;

                const freed = this.ungroupOne(transaction, group, removed);
                freedIds.push(...freed);
            }

            const keptIds = keptSelected.map((entity) => entity.id);
            const selectedIds = [...freedIds, ...keptIds];
            const selectAfter = selectedIds.filter((id) => level.findEntity(id) !== undefined);

            return { kind: 'done', selectAfter };
        });
        if (outcome.kind === 'refused') return outcome;

        const text = removedText(removed);
        if (text !== undefined) return { ...outcome, text };

        return outcome;
    }

    private ungroupOne(transaction: EditTransaction, group: Entity, removed: RemovedWithGroups) {
        const { level } = this.session.openLevel;
        const parent = group.parent;
        if (parent === undefined) throw new Error('The World is never ungrouped.');

        const children = [...group.children];
        const childIds = children.map((child) => child.id);
        this.moveChildrenOut(transaction, group, parent, children);

        for (const component of group.components) {
            const typeName = component.schema.typeName;
            if (!UNREPORTED_COMPONENTS.has(typeName)) {
                removed.componentNames.add(typeName);
            }
        }

        const joints = attachedJoints(level, [group]);
        for (const removedEntity of [group, ...joints]) {
            const change = RemoveEntitiesChange.ofEntity(this.session.reader, removedEntity);
            transaction.apply(change);
        }

        const jointNames = joints.map((joint) => labelName(joint));
        removed.jointNames.push(...jointNames);

        return childIds;
    }

    // The children take the group's row and the rows after it, in their order, pushing the group down.
    private moveChildrenOut(transaction: EditTransaction, group: Entity, parent: Entity, children: readonly Entity[]) {
        const { worldMatrices } = this.session.openLevel.caches;
        const parentMatrix = worldMatrices.matrixOf(parent);
        const childMatrices = children.map((child) => worldMatrices.matrixOf(child));
        const groupIndex = parent.children.indexOf(group);

        children.forEach((child, childIndex) => {
            const childMatrix = childMatrices[childIndex];
            if (childMatrix === undefined) throw new Error(`Entity ${child.id} has no level matrix.`);

            const change = new MoveEntityChange({
                entityId: child.id,
                oldPlace: { parentId: group.id, index: group.children.indexOf(child) },
                newPlace: { parentId: parent.id, index: groupIndex + childIndex },
                oldTransform: transformValuesOf(child),
                newTransform: transformUnder(parentMatrix, childMatrix),
            });
            transaction.apply(change);
        });
    }

    private selectedGroups() {
        const { level, selection } = this.session.openLevel;
        const split = skipEntities(level, selection.entities, ['world', 'camera']);
        const withChildren = split.allowed.filter((entity) => entity.children.length > 0);

        return inPanelOrder(level, withChildren);
    }
}

// "Removed with the group: BodyComponent, Rope", or undefined when the groups held nothing else.
function removedText(removed: RemovedWithGroups) {
    const names = [...removed.componentNames, ...removed.jointNames];
    if (names.length === 0) return undefined;

    const listed = names.join(', ');

    return `Removed with the group: ${listed}`;
}
