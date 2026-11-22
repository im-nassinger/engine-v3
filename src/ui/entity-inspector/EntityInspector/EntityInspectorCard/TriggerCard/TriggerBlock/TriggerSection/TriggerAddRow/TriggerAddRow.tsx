import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { TriggerEdits } from '../../../../../../../../editor/entity-inspector/index.ts';
import type { TriggerAddRow as TriggerAddRowModel } from '../../../../../../../../editor/entity-inspector/index.ts';
import { Icon, Menu } from '../../../../../../../shared/index.ts';
import type { MenuEntry } from '../../../../../../../shared/index.ts';
import type { CommitTriggerEdit } from '../../../CommitTriggerEdit.ts';
import './TriggerAddRow.css';

export type TriggerAddRowProps = {
    addRow: TriggerAddRowModel;
    triggerIndex: number;
    commit: CommitTriggerEdit;
};

// Add check or Add action at the end of If or Do: a + and its label, opening the kinds of row it can add.
// With no action yet, Add action is yellow.
export function TriggerAddRow({ addRow, triggerIndex, commit }: TriggerAddRowProps) {
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);

    const entries = addRow.choices.map((choice, index) => {
        const entry: MenuEntry = {
            kind: 'action',
            id: String(index),
            label: choice.label,
            onChoose: () => commit((component) => TriggerEdits.picked(component, triggerIndex, choice.value)),
            disabledReason: choice.disabledReason,
        };

        return entry;
    });

    const toggle = () => setIsOpen((wasOpen) => !wasOpen);
    const close = () => setIsOpen(false);

    return (
        <>
            <button
                type="button"
                className="trigger-add-row"
                data-needed={addRow.isNeeded}
                aria-expanded={isOpen}
                ref={anchorRef}
                onClick={toggle}
            >
                <Icon icon={Plus} size="small" />
                <span>{addRow.label}</span>
            </button>
            {isOpen && <Menu entries={entries} onClose={close} anchor={anchorRef} />}
        </>
    );
}
