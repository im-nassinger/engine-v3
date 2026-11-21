import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';
import type { PathPointRowsProps } from '../PathPointRows/index.ts';
import { PathPointRow } from '../PathPointRow/index.ts';
import './VirtualPathPointRows.css';

// The --row token and the gap under each row, as numbers: a row is guessed this tall before it is measured.
const ROW_HEIGHT = 30;
const ROW_GAP = 4;
// A point showing its handles has a row for each under its own.
const UNFOLDED_ROWS = 3;
// Rows built past each edge, so a fast scroll doesn't show an empty strip for a frame.
const OVERSCAN = 8;

// The rows of a long path in a box of their own that scrolls, building only those in view. Each row is
// measured once shown, since a refused value's message makes it taller.
export function VirtualPathPointRows(props: PathPointRowsProps) {
    // The virtualizer is one object that changes inside, so the React Compiler would keep its first
    // answer of which rows are on screen.
    'use no memo';

    const { field, subject, points, unfolded, selected, firstSelected, onToggleFold, onCommitPoint } = props;
    const scrollElement = useRef<HTMLDivElement>(null);
    const estimateSize = (index: number) => {
        const rowCount = unfolded.has(index) ? UNFOLDED_ROWS : 1;

        return rowCount * (ROW_HEIGHT + ROW_GAP);
    };
    // eslint-disable-next-line react-hooks/incompatible-library -- the component opts out of the compiler above.
    const virtualizer = useVirtualizer({
        count: points.length,
        getScrollElement: () => scrollElement.current,
        estimateSize,
        overscan: OVERSCAN,
    });

    useEffect(() => {
        if (firstSelected === undefined) return;

        virtualizer.scrollToIndex(firstSelected, { align: 'auto' });
    }, [firstSelected, virtualizer]);

    const contentHeight = { height: `${virtualizer.getTotalSize()}px` };

    return (
        <div className="virtual-path-point-rows" ref={scrollElement}>
            <div className="content" style={contentHeight}>
                {virtualizer.getVirtualItems().map((item) => (
                    <div
                        key={item.key}
                        className="slot"
                        data-index={item.index}
                        ref={virtualizer.measureElement}
                        style={{ transform: `translateY(${item.start}px)` }}
                    >
                        <PathPointRow
                            field={field}
                            subject={subject}
                            point={points[item.index] as (typeof points)[number]}
                            index={item.index}
                            isUnfolded={unfolded.has(item.index)}
                            isSelected={selected.has(item.index)}
                            onToggleFold={onToggleFold}
                            onCommit={onCommitPoint}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
