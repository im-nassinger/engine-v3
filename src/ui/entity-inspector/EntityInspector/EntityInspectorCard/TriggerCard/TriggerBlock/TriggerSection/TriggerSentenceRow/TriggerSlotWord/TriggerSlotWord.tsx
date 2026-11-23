import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { JsonValue } from '../../../../../../../../../core/fields/index.ts';
import { TriggerEdits } from '../../../../../../../../../editor/entity-inspector/index.ts';
import type {
    TriggerChoice,
    TriggerMenuGroup,
    TriggerTypedEntry,
    TriggerWord,
    TriggerWordEntry,
} from '../../../../../../../../../editor/entity-inspector/index.ts';
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
    // A picked item that asks for a value first, such as "New name…".
    const [asking, setAsking] = useState<TriggerChoice | undefined>(undefined);
    const anchorRef = useRef<HTMLButtonElement>(null);
    const { entry } = word;

    const toggle = () => setIsOpen((wasOpen) => !wasOpen);
    const closeMenu = () => setIsOpen(false);
    const close = () => {
        setIsOpen(false);
        setAsking(undefined);
    };

    const pick = (choice: TriggerChoice) => {
        if (choice.asks !== undefined) {
            setAsking(choice);
            return;
        }

        commit((component) => TriggerEdits.picked(component, triggerIndex, choice.value));
    };

    const typeValue = (value: JsonValue) => {
        close();
        if (asking === undefined) {
            commit((component) => TriggerEdits.typed(component, triggerIndex, word.address, value));
            return;
        }

        const picked = asking.value;
        commit((component) => TriggerEdits.pickedAndTyped(component, triggerIndex, picked, word.address, value));
    };

    // The menu closes as an item is picked; an item that asks keeps its field open after it.
    let popup: ReactNode = null;
    const typedEntry = typedEntryOf(entry);
    if (asking?.asks !== undefined) {
        popup = <TriggerWordField entry={asking.asks} anchor={anchorRef} onType={typeValue} onClose={close} />;
    } else if (isOpen && typedEntry !== undefined) {
        popup = <TriggerWordField entry={typedEntry} anchor={anchorRef} onType={typeValue} onClose={close} />;
    } else if (isOpen) {
        const entries = menuEntriesOf(entry, pick);
        popup = <Menu entries={entries} onClose={closeMenu} anchor={anchorRef} />;
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

function typedEntryOf(entry: TriggerWordEntry): TriggerTypedEntry | undefined {
    if (entry.kind === 'menu' || entry.kind === 'groups' || entry.kind === 'submenus') return undefined;

    return entry;
}

// Each group is under its title, with a line before every group after the first, and a group with no
// choice says so, disabled. A component opens its values in a submenu.
function menuEntriesOf(entry: TriggerWordEntry, pick: (choice: TriggerChoice) => void): MenuEntry[] {
    if (entry.kind === 'menu') return actionsOf(entry.choices, pick, 'item');
    if (entry.kind === 'submenus') {
        return entry.submenus.map((submenu, index) => {
            const entries = actionsOf(submenu.choices, pick, `submenu-${index}`);

            return { kind: 'submenu', id: `submenu-${index}`, label: submenu.label, entries };
        });
    }
    if (entry.kind !== 'groups') return [];

    return entry.groups.flatMap((group, index) => groupEntries(group, index, pick));
}

function groupEntries(group: TriggerMenuGroup, index: number, pick: (choice: TriggerChoice) => void) {
    const entries: MenuEntry[] = [];
    if (index > 0) {
        entries.push({ kind: 'separator', id: `separator-${index}` });
    }
    entries.push({ kind: 'heading', id: `heading-${index}`, label: group.title });
    entries.push(...actionsOf(group.choices, pick, `group-${index}`));
    if (group.choices.length === 0 && group.emptyText !== undefined) {
        const empty = group.emptyText;
        entries.push({ kind: 'action', id: `empty-${index}`, label: empty, onChoose: () => {}, disabledReason: empty });
    }

    return entries;
}

function actionsOf(choices: readonly TriggerChoice[], pick: (choice: TriggerChoice) => void, idPrefix: string) {
    return choices.map((choice, index) => {
        const entry: MenuEntry & { kind: 'action' } = {
            kind: 'action',
            id: `${idPrefix}-${index}`,
            label: choice.label,
            onChoose: () => pick(choice),
            disabledReason: choice.disabledReason,
            note: choice.note,
        };

        return entry;
    });
}
