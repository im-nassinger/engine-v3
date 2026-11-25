import { Plus } from 'lucide-react';
import { useRef } from 'react';
import { TriggerEdits } from '../../../../../../../../editor/entity-inspector/index.ts';
import type { ScriptGap } from '../../../../../../../../editor/entity-inspector/index.ts';
import { Icon, Menu } from '../../../../../../../shared/index.ts';
import type { CommitTriggerEdit } from '../../../CommitTriggerEdit.ts';
import { triggerMenuEntries } from '../../../triggerMenuEntries.ts';
import './ScriptSlot.css';

export type ScriptSlotProps = {
    gap: ScriptGap;
    zIndex: number;
    // Nothing under it, so no tooth.
    isEnd: boolean;
    // The last thing inside the If, whose bottom bar covers 2 px more of it.
    isLast: boolean;
    isInsideIf: boolean;
    isMenuOpen: boolean;
    onMenuOpen: (isOpen: boolean) => void;
    // The mouse is on the slot, which keeps it open.
    onHover: (gap: number, slot: Element) => void;
    // A block is about to be added at the slot, taking its place.
    onAdd: () => void;
    triggerIndex: number;
    commit: CommitTriggerEdit;
};

// An empty "add a block" slot, shaped like a block, in a room that SlotMotion shows, grows and fades (it is
// hidden until then). Clicking it opens the gap's add menu: the check group, then the actions, each added at
// the gap as one step.
export function ScriptSlot({ gap, zIndex, isEnd, isLast, isInsideIf, ...menuProps }: ScriptSlotProps) {
    const { isMenuOpen, onMenuOpen, onHover, onAdd, triggerIndex, commit } = menuProps;
    const anchorRef = useRef<HTMLButtonElement>(null);

    const entries = triggerMenuEntries(gap.addMenu, (choice) => {
        onAdd();
        commit((component) => TriggerEdits.inserted(component, triggerIndex, choice.value));
    });

    return (
        <div
            className="script-slot"
            data-gap={gap.index}
            data-shown="false"
            style={{ zIndex }}
            onPointerMove={(event) => onHover(gap.index, event.currentTarget)}
        >
            <button
                type="button"
                className="body"
                data-end={isEnd}
                data-last={isLast}
                data-inside-if={isInsideIf}
                aria-expanded={isMenuOpen}
                ref={anchorRef}
                onClick={() => onMenuOpen(!isMenuOpen)}
            >
                <i className="tooth" />
                <Icon icon={Plus} />
                <span>add a block</span>
            </button>
            {isMenuOpen && <Menu entries={entries} onClose={() => onMenuOpen(false)} anchor={anchorRef} />}
        </div>
    );
}
