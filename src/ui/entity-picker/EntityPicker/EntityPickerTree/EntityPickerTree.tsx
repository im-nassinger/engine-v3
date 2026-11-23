import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import type { EntityId, Level } from '../../../../core/level/index.ts';
import type { EntityPickerRow } from '../../../../editor/entities-viewer/index.ts';
import { EntityPickerTreeRow } from './EntityPickerTreeRow/index.ts';
import './EntityPickerTree.css';

export type EntityPickerTreeProps = {
    level: Level;
    rows: readonly EntityPickerRow[];
    // While searching, the parents shown around a match are faint.
    isSearching: boolean;
    chosenId: EntityId | undefined;
    refusalOf: (entityId: EntityId) => string | undefined;
    onPick: (entityId: EntityId) => void;
    onToggleFold: (entityId: EntityId, isFolded: boolean) => void;
};

// The Entities viewer's row height, the --row token, which the virtual list needs as a number.
const ROW_HEIGHT = 30;
// Rows built past each edge, so a fast scroll doesn't show an empty strip for a frame.
const OVERSCAN = 8;

// Only the rows on screen exist, so a 10,000-entity level builds a few dozen.
export function EntityPickerTree(props: EntityPickerTreeProps) {
    // The virtualizer is one object that changes inside, so the React Compiler would keep its first
    // answer of which rows are on screen.
    'use no memo';

    const { level, rows, isSearching, chosenId, refusalOf, onPick, onToggleFold } = props;
    const scrollElement = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line react-hooks/incompatible-library -- the component opts out of the compiler above.
    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollElement.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: OVERSCAN,
    });

    const contentHeight = { height: `${virtualizer.getTotalSize()}px` };
    const shown = virtualizer.getVirtualItems().flatMap((virtualRow) => {
        const row = rows[virtualRow.index];
        if (row === undefined) return [];

        return [{ row, top: virtualRow.start }];
    });

    return (
        <div className="entity-picker-tree" ref={scrollElement}>
            <div className="content" role="tree" aria-label="Entities" style={contentHeight}>
                {shown.map(({ row, top }) => (
                    <EntityPickerTreeRow
                        key={row.entityId}
                        level={level}
                        row={row}
                        top={top}
                        isChosen={row.entityId === chosenId}
                        isFaint={isSearching && !row.isMatch}
                        isRefused={refusalOf(row.entityId) !== undefined}
                        onPick={() => onPick(row.entityId)}
                        onToggleFold={() => onToggleFold(row.entityId, row.isFolded)}
                    />
                ))}
            </div>
        </div>
    );
}
