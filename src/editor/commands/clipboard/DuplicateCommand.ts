import type { Entity } from '../../../core/level/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import type { EntityData } from '../../../core/level-data/index.ts';
import { IdRemapping, copiedRoots } from '../../clipboard/index.ts';
import { AddEntitiesChange } from '../../history/index.ts';
import type { EditOutcome } from '../../history/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';
import { skippedRefusal } from '../shared/skippedRefusal.ts';
import { stepLabel } from '../shared/stepLabel.ts';

import { selectionSplit } from './copySelection.ts';
import { pasteRefusalText } from './pasteRefusalText.ts';
import { withNextNames } from './withNextNames.ts';

const DUPLICATED = 'duplicated';
const LOCKED = 'This group is locked';

// Copies each selected entity in place, without the clipboard: the copy goes directly above its original
// in the same group, with no offset and the next name (withNextNames), and the copies become the selection, in one step "Duplicate 3
// entities". Links inside the duplicated set point at the copies, links outside it keep their entity.
// Refused whole, before anything stays changed, inside a locked group or over a limit.
export class DuplicateCommand implements EditorCommand {
    readonly id = 'edit.duplicate';
    readonly label = 'Duplicate';
    readonly menu = { menu: 'Edit', section: 2, order: 40 } as const;
    readonly shortcuts = ['Ctrl+D'];
    // The requirement says everywhere except the code editor, which comes in v2 with its own scope.
    readonly shortcutScope = 'everywhere';
    private readonly session: EditorSession;
    private readonly writer = new LevelWriter();
    private readonly remapping: IdRemapping;

    constructor(session: EditorSession) {
        this.session = session;
        this.remapping = new IdRemapping(session.registry);
    }

    availability(): Availability {
        const split = selectionSplit(this.session);
        const refusal = skippedRefusal(split, DUPLICATED);
        if (refusal !== undefined) return { enabled: false, reason: refusal };

        return { enabled: true };
    }

    run(): CommandOutcome {
        const split = selectionSplit(this.session);
        const refusal = skippedRefusal(split, DUPLICATED);
        if (refusal !== undefined) return { kind: 'refused', reason: refusal };

        const outcome = this.duplicate(copiedRoots(this.session.openLevel.level, split.allowed));
        if (outcome.kind === 'refused') return outcome;

        return { kind: 'done', skipped: split.skipped };
    }

    private duplicate(originals: readonly Entity[]): EditOutcome {
        const openLevel = this.session.openLevel;
        const { level, editor, caches } = openLevel;
        const reader = this.session.reader;

        const isInLockedGroup = originals.some((original) => caches.hidden.isLocked(requireParent(original)));
        if (isInLockedGroup) return { kind: 'refused', reason: LOCKED };

        // Written as they are, since each copy stays in its original's group, then remapped as one set so
        // links between the roots point at the copies.
        const written = this.writer.writeSubtree(originals);
        const remapped = this.remapping.remap({ sourceToken: openLevel.sourceToken, entities: written }, openLevel);
        const named = withNextNames(remapped, level);
        const label = stepLabel('Duplicate', originals);

        return editor.edit(label, (transaction) => {
            const copyIds = [];

            // One root at a time, each checked against the level as the earlier copies left it, so the
            // entity limit counts them all. A refusal rolls back the copies already in.
            for (const [offset, original] of originals.entries()) {
                const copy = named[offset] as EntityData;
                const parent = requireParent(original);

                const check = reader.checkSubtree(level, [copy], parent);
                if (!check.ok) return { kind: 'refused', reason: pasteRefusalText(check.refusal) };

                const place = { parentId: parent.id, index: parent.children.indexOf(original) };
                transaction.apply(new AddEntitiesChange({ reader, entities: [copy], place }));
                copyIds.push(copy.id);
            }

            return { kind: 'done', selectAfter: copyIds };
        });
    }
}

// Copied roots are never the World, so each has a parent.
function requireParent(entity: Entity) {
    const parent = entity.parent;
    if (parent === undefined) throw new Error(`Entity ${entity.id} has no parent.`);

    return parent;
}
