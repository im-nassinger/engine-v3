import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { JsonValue } from '../../../../../../../../../core/fields/index.ts';
import { TriggerEdits } from '../../../../../../../../../editor/entity-inspector/index.ts';
import type { TriggerChoice, TriggerWord } from '../../../../../../../../../editor/entity-inspector/index.ts';
import { Menu, Tooltip } from '../../../../../../../../shared/index.ts';
import type { MenuEntry } from '../../../../../../../../shared/index.ts';
import type { CommitTriggerEdit } from '../../../../CommitTriggerEdit.ts';
import { TriggerWordField } from './TriggerWordField/index.ts';
import './TriggerSlotWord.css';

type SlotWord = TriggerWord & { readonly kind: 'slot' };

export type TriggerSlotWordProps = {
    word: SlotWord;
    triggerIndex: number;
    commit: CommitTriggerEdit;
};

// A word that can change: underlined, it opens a menu under it, or a small field for a number or a value.
// Unset, it is yellow and says what it needs; `other` under an event with none is struck through, and its
// tooltip says why.
export function TriggerSlotWord({ word, triggerIndex, commit }: TriggerSlotWordProps) {
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);
    const { entry } = word;

    const toggle = () => setIsOpen((wasOpen) => !wasOpen);
    const close = () => setIsOpen(false);

    const pick = (choice: TriggerChoice) => {
        commit((component) => TriggerEdits.picked(component, triggerIndex, choice.value));
    };

    const typeValue = (value: JsonValue) => {
        close();
        commit((component) => TriggerEdits.typed(component, triggerIndex, word.address, value));
    };

    let popup: ReactNode = null;
    if (isOpen && entry.kind === 'menu') {
        const entries = menuEntriesOf(entry.choices, pick);
        popup = <Menu entries={entries} onClose={close} anchor={anchorRef} />;
    } else if (isOpen && entry.kind !== 'menu') {
        popup = <TriggerWordField entry={entry} anchor={anchorRef} onType={typeValue} onClose={close} />;
    }

    const button = (
        <button
            type="button"
            className="trigger-slot-word"
            data-state={word.state}
            aria-expanded={isOpen}
            ref={anchorRef}
            onClick={toggle}
        >
            {word.text}
        </button>
    );

    return (
        <>
            {word.reason === undefined && button}
            {word.reason !== undefined && <Tooltip label={word.reason}>{button}</Tooltip>}
            {popup}
        </>
    );
}

function menuEntriesOf(choices: readonly TriggerChoice[], pick: (choice: TriggerChoice) => void) {
    return choices.map((choice, index) => {
        const entry: MenuEntry = {
            kind: 'action',
            id: String(index),
            label: choice.label,
            onChoose: () => pick(choice),
            disabledReason: choice.disabledReason,
        };

        return entry;
    });
}
