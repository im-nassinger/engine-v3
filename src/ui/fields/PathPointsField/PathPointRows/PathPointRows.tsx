import type { PathPoint } from '../../../../core/geometry/index.ts';
import type { FieldModel } from '../../../../editor/entity-inspector/index.ts';
import type { FieldSubject } from '../../FieldProps.ts';
import { PathPointRow } from '../PathPointRow/index.ts';
import './PathPointRows.css';

export type PathPointRowsProps = {
    field: FieldModel;
    subject: FieldSubject;
    points: readonly PathPoint[];
    // The rows showing their handles, by the point's index.
    unfolded: ReadonlySet<number>;
    onToggleFold: (index: number) => void;
    onCommitPoint: (index: number, point: PathPoint) => void;
};

// Every point's row, built at once: the list is short.
export function PathPointRows({ field, subject, points, unfolded, onToggleFold, onCommitPoint }: PathPointRowsProps) {
    return (
        <div className="path-point-rows">
            {points.map((point, index) => (
                <PathPointRow
                    key={index}
                    field={field}
                    subject={subject}
                    point={point}
                    index={index}
                    isUnfolded={unfolded.has(index)}
                    onToggleFold={onToggleFold}
                    onCommit={onCommitPoint}
                />
            ))}
        </div>
    );
}
