import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import type { EntityId } from '../../../../core/level/index.ts';
import type { EntitiesRow } from '../../../../editor/entities-viewer/index.ts';
import type { OpenLevel } from '../../../../editor/session/index.ts';
import { useCommands } from '../../../commands/index.ts';
import { useVersion } from '../../../hooks/index.ts';
import { useOpenWindows } from '../../../open-windows/index.ts';
import { DropLine } from './DropLine/index.ts';
import { EntitiesListRow } from './EntitiesListRow/index.ts';
import { RowDrag } from './row-drag/RowDrag.ts';
import { ROW_HEIGHT } from './rowLayout.ts';
import './EntitiesList.css';

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

    const { runner } = useCommands();

    const openWindows = useOpenWindows();
    const scrollElement = useRef<HTMLDivElement>(null);
    const contentElement = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line react-hooks/incompatible-library -- the component opts out of the compiler above.
    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollElement.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: OVERSCAN,
    });

    // The row to scroll into view, scrolled after the render that gave the virtualizer the new row
    // count: an ask that unfolded parents adds rows the virtualizer doesn't know about yet. A new
    // object each time, so asking for the same row again scrolls again.
    const [scrollAsk, setScrollAsk] = useState<{ entityId: EntityId } | undefined>(undefined);
    useEffect(() => {
        if (scrollAsk === undefined) return;

        const index = entitiesRows.indexOf(scrollAsk.entityId);
        if (index < 0) return;

        virtualizer.scrollToIndex(index);
    }, [scrollAsk, entitiesRows, virtualizer]);

    // A selection made outside the panel, by a command or an undo, has already unfolded its parents.
    const selectionReveal = openLevel.selectionReveal;
    useEffect(() => {
        const scrollToRevealed = () => {
            const revealedId = selectionReveal.entityId;
            if (revealedId === undefined) return;

            selectionReveal.clear();
            setScrollAsk({ entityId: revealedId });
        };

        return selectionReveal.version.subscribe(scrollToRevealed);
    }, [selectionReveal]);

    // The row whose name box is open. A rename asked by F2 scrolls its row into view first, so the
    // row exists to open the box in.
    const [renamingId, setRenamingId] = useState<EntityId | undefined>(undefined);
    const renameRequest = openLevel.renameRequest;
    useEffect(() => {
        const openAskedBox = () => {
            const askedId = renameRequest.entityId;
            if (askedId === undefined) return;

            renameRequest.clear();
            setScrollAsk({ entityId: askedId });
            setRenamingId(askedId);
        };

        return renameRequest.version.subscribe(openAskedBox);
    }, [renameRequest]);

    const endRenaming = () => setRenamingId(undefined);

    const [rowDrag] = useState(() => new RowDrag(runner, openWindows));
    useVersion(rowDrag.version);
    useEffect(() => () => rowDrag.dispose(), [rowDrag]);
    const dropTarget = rowDrag.target;

    const startDragPress = (entityId: EntityId, event: PointerEvent) => {
        const scroller = scrollElement.current;
        const content = contentElement.current;
        if (scroller === null || content === null) return;

        rowDrag.start(openLevel, entityId, { scroller, content }, event.nativeEvent);
    };

    const swallowClickAfterDrag = (event: MouseEvent) => {
        if (rowDrag.takesClick()) {
            event.stopPropagation();
        }
    };

    const contentHeight = { height: `${virtualizer.getTotalSize()}px` };
    const shownRows: ShownRow[] = [];
    for (const virtualRow of virtualizer.getVirtualItems()) {
        const row = rows[virtualRow.index];
        if (row === undefined) continue;

        shownRows.push({ row, top: virtualRow.start });
    }

    return (
        <div className="entities-list" ref={scrollElement}>
            <div
                className="content"
                ref={contentElement}
                role="tree"
                aria-label="Entities"
                aria-multiselectable
                data-dragging={rowDrag.isDragging}
                style={contentHeight}
                onPointerDownCapture={() => rowDrag.forgetClick()}
                onClickCapture={swallowClickAfterDrag}
            >
                {shownRows.map(({ row, top }) => (
                    <EntitiesListRow
                        key={row.entityId}
                        openLevel={openLevel}
                        row={row}
                        top={top}
                        isRenaming={row.entityId === renamingId}
                        onRenameStart={() => setRenamingId(row.entityId)}
                        onRenameEnd={endRenaming}
                        onDragPress={(event) => startDragPress(row.entityId, event)}
                    />
                ))}
                {dropTarget !== undefined && <DropLine target={dropTarget} />}
            </div>
        </div>
    );
}
