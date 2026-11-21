import { useState } from 'react';
import { PathPointFieldType } from '../../../core/fields/index.ts';
import type { PathPoint } from '../../../core/geometry/index.ts';
import { ListItems, MIXED } from '../../../editor/entity-inspector/index.ts';
import type { FieldProps } from '../FieldProps.ts';
import { PathPointRows } from './PathPointRows/index.ts';
import type { PathPointRowsProps } from './PathPointRows/index.ts';
import { VirtualPathPointRows } from './VirtualPathPointRows/index.ts';
import './PathPointsField.css';

// Over this many points, only the rows in view are built: 2,000 rows of a vector and a choice each would
// take the 0.2 s the Entity inspector has to show them.
const MOST_ROWS_BUILT_WHOLE = 100;

const POINT_TYPE = new PathPointFieldType();

// A path's Points: their count, then a PathPointRow per point. Each typed position, handle or corner is
// one step through the whole list, so the path's limits and its smooth points are kept by its write.
export function PathPointsField({ field, subject, onCommit }: FieldProps) {
    const [unfolded, setUnfolded] = useState<ReadonlySet<number>>(new Set());

    if (field.value === MIXED) {
        return (
            <span className="path-points-field" data-mixed="true">
                Mixed
            </span>
        );
    }

    const points = field.value as readonly PathPoint[];

    const toggleFold = (index: number) => setUnfolded((old) => toggled(old, index));
    const commitPoint = (index: number, point: PathPoint) => {
        const newPoints = ListItems.withItem(points, index, point, POINT_TYPE);
        onCommit(newPoints);
    };

    const rowsProps: PathPointRowsProps = {
        field,
        subject,
        points,
        unfolded,
        onToggleFold: toggleFold,
        onCommitPoint: commitPoint,
    };
    const isVirtual = points.length > MOST_ROWS_BUILT_WHOLE;

    return (
        <div className="path-points-field" data-mixed="false">
            <span className="count">{points.length}</span>
            <div className="rows">
                {isVirtual ? <VirtualPathPointRows {...rowsProps} /> : <PathPointRows {...rowsProps} />}
            </div>
        </div>
    );
}

function toggled(indexes: ReadonlySet<number>, index: number) {
    const changed = new Set(indexes);
    if (changed.has(index)) {
        changed.delete(index);
    } else {
        changed.add(index);
    }

    return changed;
}
