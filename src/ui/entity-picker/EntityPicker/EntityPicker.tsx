import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { EntityId, Level } from '../../../core/level/index.ts';
import { EntityPickerRows } from '../../../editor/entities-viewer/index.ts';
import { useEditorSession } from '../../EditorContext.tsx';
import { MenuPanel, rectOf, usePopupClosing, usePopupPlacement } from '../../shared/index.ts';
import type { MenuEntry } from '../../shared/index.ts';
import { useEditorTools } from '../../tools/index.ts';
import { EntityPickerSearch } from './EntityPickerSearch/index.ts';
import { EntityPickerTree } from './EntityPickerTree/index.ts';
import './EntityPicker.css';

export type EntityPickerProps = {
    level: Level;
    // The word or field that opened it. A press on it is left to it, which closes the picker itself.
    anchor: RefObject<HTMLElement | null>;
    // Above the tree, for what names no one entity: None, or a trigger's this, other and tags.
    entries: MenuEntry[];
    // Marked in the tree; undefined for none.
    chosenId: EntityId | undefined;
    // Why an entity can't be picked, such as "The camera can't be picked"; undefined when it can. A
    // refused row is greyed, and picking it, in the tree or the level view, shows the reason.
    refusalOf: (entityId: EntityId) => string | undefined;
    onPick: (entityId: EntityId) => void;
    onClose: () => void;
};

const GAP_PX = 4;

// Picks an entity the way the Entities viewer shows them: the same tree, rows and icons, folded as the
// panel is until folded here. Typing searches the names, and Enter picks the first match. The crosshair
// closes it and picks the next entity clicked in the level view. Esc and a press outside close it.
export function EntityPicker({ level, anchor, entries, chosenId, refusalOf, onPick, onClose }: EntityPickerProps) {
    // The rows are read from the level, which changes inside, so the React Compiler must not keep them.
    'use no memo';

    const session = useEditorSession();
    const { controller } = useEditorTools();
    const rootRef = useRef<HTMLDivElement>(null);
    usePopupClosing(rootRef, anchor, onClose);

    const readAnchor = () => rectOf(anchor);
    usePopupPlacement(rootRef, readAnchor, { side: 'below', align: 'start', gapPx: GAP_PX });

    const [search, setSearch] = useState('');
    const [folds, setFolds] = useState<ReadonlyMap<EntityId, boolean>>(() => new Map());
    const rows = EntityPickerRows.build(level, folds, search);
    const isSearching = search.trim() !== '';

    const take = (entityId: EntityId) => {
        const refusal = refusalOf(entityId);
        if (refusal !== undefined) {
            session.status.show(refusal);
            return;
        }

        onPick(entityId);
    };

    const pick = (entityId: EntityId) => {
        const refusal = refusalOf(entityId);
        if (refusal !== undefined) {
            session.status.show(refusal);
            return;
        }

        onPick(entityId);
        onClose();
    };

    const pickFirst = () => {
        const first = rows.find((row) => {
            const isCandidate = !isSearching || row.isMatch;
            return isCandidate && refusalOf(row.entityId) === undefined;
        });
        if (first === undefined) return;

        pick(first.entityId);
    };

    const pickInLevel = () => {
        onClose();
        controller.waitForPick((entityId) => {
            if (entityId === undefined) return;

            take(entityId);
        });
    };

    const toggleFold = (entityId: EntityId, isFolded: boolean) => {
        const changed = new Map(folds);
        changed.set(entityId, !isFolded);
        setFolds(changed);
    };

    let noneText: string | undefined;
    if (rows.length === 0) {
        noneText = 'No entity matches';
    }

    return (
        <div className="entity-picker" ref={rootRef} role="dialog" aria-label="Pick an entity">
            {entries.length > 0 && <MenuPanel entries={entries} onChoose={onClose} isPlain />}
            <EntityPickerSearch
                search={search}
                onSearch={setSearch}
                onEnter={pickFirst}
                onPickInLevel={pickInLevel}
                noneText={noneText}
            />
            <EntityPickerTree
                level={level}
                rows={rows}
                isSearching={isSearching}
                chosenId={chosenId}
                refusalOf={refusalOf}
                onPick={pick}
                onToggleFold={toggleFold}
            />
        </div>
    );
}
