import type { EntityId, Level } from '../../core/level/index.ts';

import type { LevelChange } from './changes/index.ts';
import type { EditOutcome } from './EditOutcome.ts';
import { EditTransaction } from './EditTransaction.ts';
import type { History } from './History.ts';
import { READ_ONLY_REASON, ReadOnlyMode } from './ReadOnlyMode.ts';

// What LevelEditor needs of the Selection. A shape, not the class, so editor/history never imports
// editor/selection or editor/session, which import history in turn.
export type EditedSelection = {
    readonly ids: readonly EntityId[];
    replace(ids: readonly EntityId[]): void;
};

// What LevelEditor needs of the CurrentGroup.
export type EditedGroup = {
    readonly path: readonly EntityId[];
    restore(path: readonly EntityId[]): void;
};

export type LevelEditorOptions = {
    readonly level: Level;
    readonly history: History;
    readonly selection: EditedSelection;
    readonly currentGroup: EditedGroup;
    // The session's. Never read-only when left out.
    readonly readOnly?: ReadOnlyMode;
};

// The one way to change the level as a step: every command's edit, undo and redo go through here, so
// each step also keeps the selection and the current group before and after it.
export class LevelEditor {
    private readonly level: Level;
    private readonly history: History;
    private readonly selection: EditedSelection;
    private readonly currentGroup: EditedGroup;
    private readonly readOnly: ReadOnlyMode;

    constructor(options: LevelEditorOptions) {
        this.level = options.level;
        this.history = options.history;
        this.selection = options.selection;
        this.currentGroup = options.currentGroup;
        this.readOnly = options.readOnly ?? new ReadOnlyMode();
    }

    // In a tab without the level's lock: every edit, undo and redo is refused and changes nothing.
    get isReadOnly() {
        return this.readOnly.isOn;
    }

    // A refused or throwing command leaves the level, the selection and the current group as before.
    edit(label: string, work: (transaction: EditTransaction) => EditOutcome): EditOutcome {
        if (this.isReadOnly) return { kind: 'refused', reason: READ_ONLY_REASON };

        const selectionBefore = this.selection.ids;
        const groupPathBefore = this.currentGroup.path;
        const transaction = new EditTransaction(this.level);

        let outcome: EditOutcome;
        try {
            outcome = work(transaction);
        } catch (error) {
            this.rollBack(transaction, selectionBefore, groupPathBefore);
            throw error;
        }

        if (outcome.kind === 'refused') {
            this.rollBack(transaction, selectionBefore, groupPathBefore);
            return outcome;
        }

        if (outcome.selectAfter !== undefined) {
            this.selection.replace(outcome.selectAfter);
        }

        const changes = transaction.takeChanges();
        if (changes.length === 0) return outcome;

        this.history.record({
            label,
            changes,
            selectionBefore,
            selectionAfter: this.selection.ids,
            groupPathBefore,
            groupPathAfter: this.currentGroup.path,
            joinKey: undefined,
        });

        return outcome;
    }

    // For changes already in place: a drag's values or a nudge, written live. The selection didn't change.
    recordApplied(label: string, changes: readonly LevelChange[], joinKey?: string) {
        if (changes.length === 0) return;
        if (this.isReadOnly) throw new Error('A read-only level records no step.');

        const selectionIds = this.selection.ids;
        const groupPath = this.currentGroup.path;

        this.history.record({
            label,
            changes,
            selectionBefore: selectionIds,
            selectionAfter: selectionIds,
            groupPathBefore: groupPath,
            groupPathAfter: groupPath,
            joinKey,
        });
    }

    undo() {
        if (this.isReadOnly) return undefined;

        const step = this.history.undo(this.level);
        if (step === undefined) return undefined;

        this.restorePlace(step.selectionBefore, step.groupPathBefore);

        return step;
    }

    redo() {
        if (this.isReadOnly) return undefined;

        const step = this.history.redo(this.level);
        if (step === undefined) return undefined;

        this.restorePlace(step.selectionAfter, step.groupPathAfter);

        return step;
    }

    private rollBack(
        transaction: EditTransaction,
        selectionBefore: readonly EntityId[],
        groupPathBefore: readonly EntityId[],
    ) {
        transaction.rollback();
        this.restorePlace(selectionBefore, groupPathBefore);
    }

    // The group first, then the selection. Ids no longer in the level are left out rather than refused.
    private restorePlace(selectionIds: readonly EntityId[], groupPath: readonly EntityId[]) {
        this.currentGroup.restore(groupPath);

        const existingIds = selectionIds.filter((id) => this.level.findEntity(id) !== undefined);
        this.selection.replace(existingIds);
    }
}
