import { useState } from 'react';
import type { Entity, EntityId, Level } from '../../../../core/level/index.ts';
import { labelName } from '../../../../core/level/index.ts';
import { EntityChoices } from '../../../../editor/entity-inspector/index.ts';
import { Menu, MenuSearch, useOpenMenu } from '../../../shared/index.ts';
import type { MenuEntry } from '../../../shared/index.ts';

export type EntityFieldMenuProps = {
    level: Level;
    // The field's own entities, which it can't point at.
    ownIds: readonly EntityId[];
    chosenValue: unknown;
    onChoose: (value: EntityId | null) => void;
};

// None, then the entities whose name holds what is typed, in panel order. Enter picks the first one.
export function EntityFieldMenu({ level, ownIds, chosenValue, onChoose }: EntityFieldMenuProps) {
    // The choices are read from the level, which changes inside, so the React Compiler must not keep them.
    'use no memo';

    const { close, anchor } = useOpenMenu();
    const [search, setSearch] = useState('');

    const choices = EntityChoices.matching(level, ownIds, search);

    const chooseFirst = () => {
        const first = choices[0];
        if (first === undefined) return;

        onChoose(first.id);
        close();
    };

    let noneText;
    if (choices.length === 0) {
        noneText = 'No entity matches';
    }

    const searchBox = (
        <MenuSearch
            label="Search entities"
            search={search}
            onSearch={setSearch}
            onEnter={chooseFirst}
            noneText={noneText}
        />
    );

    const entries = menuEntriesOf(choices, chosenValue, onChoose);

    return <Menu entries={entries} onClose={close} anchor={anchor} header={searchBox} />;
}

function menuEntriesOf(
    choices: readonly Entity[],
    chosenValue: unknown,
    onChoose: (value: EntityId | null) => void,
): MenuEntry[] {
    const noneEntry: MenuEntry = {
        kind: 'action',
        id: 'none',
        label: 'None',
        checked: chosenValue === null,
        onChoose: () => onChoose(null),
    };

    const entityEntries = choices.map((entity): MenuEntry => ({
        kind: 'action',
        id: String(entity.id),
        label: labelName(entity),
        checked: entity.id === chosenValue,
        onChoose: () => onChoose(entity.id),
    }));

    return [noneEntry, ...entityEntries];
}
