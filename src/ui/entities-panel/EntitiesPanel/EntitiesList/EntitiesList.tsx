import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import type { EntitiesRow } from '../../../../editor/entities-panel/index.ts';
import type { OpenLevel } from '../../../../editor/session/index.ts';
import { useVersion } from '../../../hooks/index.ts';
import { EntitiesListRow } from './EntitiesListRow/index.ts';
import './EntitiesList.css';

// The --row token. The virtual list needs it as a number to place rows without measuring them.
const ROW_HEIGHT = 28;
// Rows built past each edge, so a fast scroll doesn't show an empty strip for a frame.
const OVERSCAN = 8;

type ShownRow = {
    readonly row: EntitiesRow;
    readonly top: number;
};

export type EntitiesListProps = {
    openLevel: OpenLevel;
};

// Only the rows on screen exist, so a 10,000-entity level builds a few dozen. The list redraws when
// the rows change (a fold, a move, a new entity); a row's own look follows its entity.
export function EntitiesList({ openLevel }: EntitiesListProps) {
    // The virtualizer is one object that changes inside, so the React Compiler would keep its first
    // answer of which rows are on screen.
    'use no memo';

    const entitiesRows = openLevel.entitiesRows;
    useVersion(entitiesRows.version);
    const rows = entitiesRows.rows;

    const scrollElement = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line react-hooks/incompatible-library -- the component opts out of the compiler above.
    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollElement.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: OVERSCAN,
    });

    const contentHeight = { height: `${virtualizer.getTotalSize()}px` };
    const shownRows: ShownRow[] = [];
    for (const virtualRow of virtualizer.getVirtualItems()) {
        const row = rows[virtualRow.index];
        if (row === undefined) continue;

        shownRows.push({ row, top: virtualRow.start });
    }

    return (
        <div className="entities-list" ref={scrollElement}>
            <div className="content" role="tree" aria-label="Entities" aria-multiselectable style={contentHeight}>
                {shownRows.map(({ row, top }) => (
                    <EntitiesListRow key={row.entityId} openLevel={openLevel} row={row} top={top} />
                ))}
            </div>
        </div>
    );
}
