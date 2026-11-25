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
    triggerIndex: number;
    commit: CommitTriggerEdit;
};

// An empty "add a block" slot, shaped like a block. Clicking it opens the gap's add menu: the check group,
// then the actions, each added at the gap as one step.
export function ScriptSlot({ gap, zIndex, isEnd, isLast, isInsideIf, ...menuProps }: ScriptSlotProps) {
    const { isMenuOpen, onMenuOpen, triggerIndex, commit } = menuProps;
    const anchorRef = useRef<HTMLButtonElement>(null);

    const entries = triggerMenuEntries(gap.addMenu, (choice) => {
        commit((component) => TriggerEdits.inserted(component, triggerIndex, choice.value));
    });

    return (
        <>
            <button
                type="button"
                className="script-slot"
                data-gap={gap.index}
                data-end={isEnd}
                data-last={isLast}
                data-inside-if={isInsideIf}
                aria-expanded={isMenuOpen}
                style={{ zIndex }}
                ref={anchorRef}
                onClick={() => onMenuOpen(!isMenuOpen)}
            >
                <i className="tooth" />
                <Icon icon={Plus} />
                <span>add a block</span>
            </button>
            {isMenuOpen && <Menu entries={entries} onClose={() => onMenuOpen(false)} anchor={anchorRef} />}
        </>
    );
}
