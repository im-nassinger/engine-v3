import { useRef } from 'react';
import { TriggerEdits } from '../../../../../../../../../editor/entity-inspector/index.ts';
import type {
    ScriptReplaceMenu,
    TriggerChoice,
    TriggerRowPart,
} from '../../../../../../../../../editor/entity-inspector/index.ts';
import type { Point } from '../../../../../../../../../core/geometry/index.ts';
import { Menu } from '../../../../../../../../shared/index.ts';
import type { MenuEntry, MenuItem } from '../../../../../../../../shared/index.ts';
import type { CommitTriggerEdit } from '../../../../CommitTriggerEdit.ts';
import { triggerMenuEntries } from '../../../../triggerMenuEntries.ts';
import './BlockContextMenu.css';

// The part the menu acts on: the block's event, action, or the check under the mouse.
export type ContextPart = {
    readonly part: TriggerRowPart;
    readonly canRemove: boolean;
    readonly replaceMenu: ScriptReplaceMenu;
};

export type BlockContextMenuProps = {
    contextPart: ContextPart;
    // Where the block was right-clicked, from its top left corner.
    point: Point;
    triggerIndex: number;
    commit: CommitTriggerEdit;
    onClose: () => void;
};

const NO_DELETE_REASON = 'A trigger always has its event';

// A block's context menu (owner, 2026-11-25): Replace, opening beside it what can take the part's place, and
// Delete. The event block can't be deleted.
export function BlockContextMenu({ contextPart, point, triggerIndex, commit, onClose }: BlockContextMenuProps) {
    const anchorRef = useRef<HTMLSpanElement>(null);
    const { part, canRemove } = contextPart;

    const replace = (choice: TriggerChoice) => {
        commit((component) => TriggerEdits.picked(component, triggerIndex, choice.value));
    };

    const remove = () => {
        commit((component) => TriggerEdits.removed(component, triggerIndex, part));
    };

    const replaceEntries = triggerMenuEntries(contextPart.replaceMenu, replace);
    const disabledReason = canRemove ? undefined : NO_DELETE_REASON;
    const entries: MenuEntry[] = [
        { kind: 'submenu', id: 'replace', label: 'Replace', entries: replaceEntries.filter(isMenuItem) },
        { kind: 'action', id: 'delete', label: 'Delete', onChoose: remove, disabledReason },
    ];

    return (
        <span className="block-context-menu" ref={anchorRef} style={{ left: point.x, top: point.y }}>
            <Menu entries={entries} onClose={onClose} anchor={anchorRef} />
        </span>
    );
}

// A submenu holds no submenu, and no replace menu has one.
function isMenuItem(entry: MenuEntry): entry is MenuItem {
    return entry.kind !== 'submenu';
}
