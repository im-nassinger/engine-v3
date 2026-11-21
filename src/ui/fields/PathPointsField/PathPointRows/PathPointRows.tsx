import { useEffect, useRef } from 'react';
import type { PathPoint } from '../../../../core/geometry/index.ts';
import type { FieldModel } from '../../../../editor/entity-inspector/index.ts';
import type { FieldSubject } from '../../FieldProps.ts';
import { PathPointRow } from '../PathPointRow/index.ts';
import './PathPointRows.css';

export type PathPointRowsProps = {
    field: FieldModel;
    subject: FieldSubject;
    points: readonly PathPoint[];
    // The rows showing their handles, by the point's index: those unfolded by hand and the selected ones.
    unfolded: ReadonlySet<number>;
    // The points selected in the level view, and the first of them, which the list scrolls to.
    selected: ReadonlySet<number>;
    firstSelected: number | undefined;
    onToggleFold: (index: number) => void;
    onCommitPoint: (index: number, point: PathPoint) => void;
};

// Every point's row, built at once: the list is short.
export function PathPointRows(props: PathPointRowsProps) {
    const { field, subject, points, unfolded, selected, firstSelected, onToggleFold, onCommitPoint } = props;
    const rowsElement = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (firstSelected === undefined) return;

        const row = rowsElement.current?.querySelector(`.path-point-row[data-index="${firstSelected}"]`);
        row?.scrollIntoView({ block: 'nearest' });
    }, [firstSelected]);

    return (
        <div className="path-point-rows" ref={rowsElement}>
            {points.map((point, index) => (
                <PathPointRow
                    key={index}
                    field={field}
                    subject={subject}
                    point={point}
                    index={index}
                    isUnfolded={unfolded.has(index)}
                    isSelected={selected.has(index)}
                    onToggleFold={onToggleFold}
                    onCommit={onCommitPoint}
                />
            ))}
        </div>
    );
}
