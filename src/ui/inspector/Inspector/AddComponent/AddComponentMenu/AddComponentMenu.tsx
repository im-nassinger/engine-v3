import { useState } from 'react';
import type { RefObject } from 'react';
import { addComponent } from '../../../../../editor/commands/index.ts';
import type { EntityId } from '../../../../../core/level/index.ts';
import type { AddableComponent } from '../../../../../editor/inspector/index.ts';
import type { OpenLevel } from '../../../../../editor/session/index.ts';
import { useEditorSession } from '../../../../EditorContext.tsx';
import { Menu, MenuSearch } from '../../../../shared/index.ts';
import type { MenuEntry } from '../../../../shared/index.ts';

export type AddComponentMenuProps = {
    openLevel: OpenLevel;
    entries: readonly AddableComponent[];
    entityIds: readonly EntityId[];
    anchor: RefObject<HTMLElement | null>;
    onClose: () => void;
};

// The search box and the components whose name holds what is typed, a line between menu sections. Enter
// adds the first one that can be added. A disabled entry says why in its tooltip.
export function AddComponentMenu({ openLevel, entries, entityIds, anchor, onClose }: AddComponentMenuProps) {
    const session = useEditorSession();
    const [search, setSearch] = useState('');

    const matching = entriesMatching(entries, search);

    const add = (entry: AddableComponent) => {
        const outcome = addComponent(openLevel, entityIds, entry.componentClass);
        if (outcome.kind !== 'refused') return;

        session.status.show(outcome.reason);
    };

    const addFirstMatch = () => {
        const first = matching.find((entry) => entry.availability.enabled);
        if (first === undefined) return;

        add(first);
        onClose();
    };

    let noneText;
    if (matching.length === 0) {
        noneText = 'No component matches';
    }

    const searchBox = (
        <MenuSearch
            label="Search components"
            search={search}
            onSearch={setSearch}
            onEnter={addFirstMatch}
            noneText={noneText}
        />
    );

    const menuEntries = menuEntriesOf(matching, add);

    return <Menu entries={menuEntries} onClose={onClose} anchor={anchor} header={searchBox} />;
}

function entriesMatching(entries: readonly AddableComponent[], search: string) {
    const wanted = search.trim().toLowerCase();
    if (wanted === '') return entries;

    return entries.filter((entry) => entry.typeName.toLowerCase().includes(wanted));
}

function menuEntriesOf(entries: readonly AddableComponent[], add: (entry: AddableComponent) => void) {
    const menuEntries: MenuEntry[] = [];
    let previousSection: string | undefined;

    for (const entry of entries) {
        const startsSection = previousSection !== undefined && entry.section !== previousSection;
        if (startsSection) {
            menuEntries.push({ kind: 'separator', id: `before:${entry.section}` });
        }

        previousSection = entry.section;

        let disabledReason;
        if (!entry.availability.enabled) {
            disabledReason = entry.availability.reason;
        }

        const choose = () => add(entry);
        menuEntries.push({
            kind: 'action',
            id: entry.typeName,
            label: entry.typeName,
            onChoose: choose,
            disabledReason,
        });
    }

    return menuEntries;
}
