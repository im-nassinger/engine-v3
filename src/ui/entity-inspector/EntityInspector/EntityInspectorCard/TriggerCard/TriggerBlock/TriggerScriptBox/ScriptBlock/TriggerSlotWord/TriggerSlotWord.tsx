import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { JsonValue } from '../../../../../../../../../core/fields/index.ts';
import type { EntityId } from '../../../../../../../../../core/level/index.ts';
import { TriggerEdits, VALUE_SEPARATOR } from '../../../../../../../../../editor/entity-inspector/index.ts';
import type {
    TriggerChoice,
    TriggerEntitiesEntry,
    TriggerTypedEntry,
    TriggerWord,
    TriggerWordEntry,
} from '../../../../../../../../../editor/entity-inspector/index.ts';
import type { OpenLevel } from '../../../../../../../../../editor/session/index.ts';
import { EntityPicker } from '../../../../../../../../entity-picker/index.ts';
import { Menu, Tooltip, useEntityRowDrop } from '../../../../../../../../shared/index.ts';
import type { MenuEntry } from '../../../../../../../../shared/index.ts';
import type { CommitTriggerEdit } from '../../../../CommitTriggerEdit.ts';
import { actionsOf, triggerMenuEntries } from '../../../../triggerMenuEntries.ts';
import { TriggerWordField } from './TriggerWordField/index.ts';
import './TriggerSlotWord.css';

type SlotWord = TriggerWord & { readonly kind: 'slot' };

export type TriggerSlotWordProps = {
    openLevel: OpenLevel;
    word: SlotWord;
    triggerIndex: number;
    commit: CommitTriggerEdit;
};

// A block's value box (v4 fix 4): a menu box in the block's colour darkened by a quarter, with a ▾, opening a
// menu or the entity picker for a target; or a white oval opening a small field for a number or a value. A
// value's path from its entity is dim, the value bright: `Transform › Position`. Unset, it is yellow and
// says what it needs; `other` under an event with none is struck through, and its tooltip says why. A row
// dragged from the Entities viewer and dropped on a target word picks that entity.
export function TriggerSlotWord({ openLevel, word, triggerIndex, commit }: TriggerSlotWordProps) {
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

    const pickEntity = (entityId: EntityId) => {
        if (entry.kind !== 'entities') return;

        const picked = entry.placeEntity(entityId);
        commit((component) => TriggerEdits.picked(component, triggerIndex, picked));
    };

    const dropRef = useEntityRowDrop<HTMLSpanElement>(pickEntity);

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
    } else if (isOpen && entry.kind === 'entities') {
        const entries = pickerEntriesOf(entry, pick);
        popup = (
            <EntityPicker
                level={openLevel.level}
                anchor={anchorRef}
                entries={entries}
                chosenId={entry.chosenId}
                refusalOf={() => undefined}
                onPick={pickEntity}
                onClose={closeMenu}
            />
        );
    } else if (isOpen && typedEntry !== undefined) {
        popup = <TriggerWordField entry={typedEntry} anchor={anchorRef} onType={typeValue} onClose={close} />;
    } else if (isOpen && isMenuEntry(entry)) {
        const entries = triggerMenuEntries(entry, pick);
        popup = <Menu entries={entries} onClose={closeMenu} anchor={anchorRef} />;
    }

    const button = (
        <button
            type="button"
            className="trigger-slot-word"
            data-look={typedEntry === undefined ? 'menu' : 'number'}
            data-state={word.state}
            aria-expanded={isOpen}
            ref={anchorRef}
            onClick={toggle}
        >
            <SlotText text={word.text} />
        </button>
    );

    const shown = word.reason === undefined ? button : <Tooltip label={word.reason}>{button}</Tooltip>;

    return (
        <>
            {entry.kind === 'entities' && <span ref={dropRef}>{shown}</span>}
            {entry.kind !== 'entities' && shown}
            {popup}
        </>
    );
}

function typedEntryOf(entry: TriggerWordEntry): TriggerTypedEntry | undefined {
    if (isMenuEntry(entry) || entry.kind === 'entities') return undefined;

    return entry;
}

function isMenuEntry(entry: TriggerWordEntry) {
    return entry.kind === 'menu' || entry.kind === 'groups' || entry.kind === 'submenus';
}

// `this` and `other`, then every entity with a tag, above the tree.
function pickerEntriesOf(entry: TriggerEntitiesEntry, pick: (choice: TriggerChoice) => void) {
    const entries: MenuEntry[] = actionsOf(entry.choices, pick, 'target');
    if (entry.tagged.length === 0) return entries;

    entries.push({ kind: 'heading', id: 'tagged', label: 'Every entity tagged' });
    entries.push(...actionsOf(entry.tagged, pick, 'tagged'));

    return entries;
}

type SlotTextProps = {
    text: string;
};

// The path's steps dim, the value bright; the text reads the same as the word's.
function SlotText({ text }: SlotTextProps) {
    const steps = text.split(VALUE_SEPARATOR);
    const value = steps.pop();
    if (steps.length === 0) return text;

    return (
        <>
            {steps.map((step, stepIndex) => (
                <span key={stepIndex} className="path">
                    {step}
                    {VALUE_SEPARATOR}
                </span>
            ))}
            {value}
        </>
    );
}
