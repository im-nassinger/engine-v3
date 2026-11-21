import { VectorFieldType } from '../../../../../core/fields/index.ts';
import type { Point } from '../../../../../core/geometry/index.ts';
import type { FieldModel } from '../../../../../editor/entity-inspector/index.ts';
import type { FieldSubject } from '../../../FieldProps.ts';
import { innerFieldOf, innerPropsOf } from '../../../inner-fields/innerField.ts';
import { VectorField } from '../../../VectorField/index.ts';
import './PathHandleRow.css';

const HANDLE_TYPE = new VectorFieldType();

const LABELS = { handleIn: 'Handle in', handleOut: 'Handle out' } as const;

export type PathHandleRowProps = {
    field: FieldModel;
    subject: FieldSubject;
    pointIndex: number;
    name: keyof typeof LABELS;
    // null: an end of an open path, which has no handle on its outer side.
    handle: Point | null;
    onCommit: (handle: Point) => void;
};

// A point's Handle in or Handle out under its row, measured from the point, or `None`.
export function PathHandleRow({ field, subject, pointIndex, name, handle, onCommit }: PathHandleRowProps) {
    const label = LABELS[name];

    return (
        <div className="path-handle-row">
            <span className="label">{label}</span>
            <span className="value">
                {handle === null && <span className="none">None</span>}
                {handle !== null && (
                    <HandleField
                        field={field}
                        subject={subject}
                        pointIndex={pointIndex}
                        name={name}
                        handle={handle}
                        onCommit={onCommit}
                    />
                )}
            </span>
        </div>
    );
}

type HandleFieldProps = Omit<PathHandleRowProps, 'handle'> & {
    handle: Point;
};

function HandleField({ field, subject, pointIndex, name, handle, onCommit }: HandleFieldProps) {
    const label = `${LABELS[name]} of point ${pointIndex + 1}`;
    const options = { key: `${pointIndex}.${name}`, label, type: HANDLE_TYPE, unit: 'px' } as const;
    const handleField = innerFieldOf(field, options, handle);
    const commitHandle = (value: unknown) => onCommit(value as Point);
    const props = innerPropsOf(subject, handleField, commitHandle);

    return <VectorField {...props} />;
}
