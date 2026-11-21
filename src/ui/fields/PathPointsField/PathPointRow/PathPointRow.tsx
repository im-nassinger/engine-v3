import { ChevronDown, ChevronRight } from 'lucide-react';
import { ChoiceFieldType, VectorFieldType } from '../../../../core/fields/index.ts';
import type { PathCorner, PathPoint, Point } from '../../../../core/geometry/index.ts';
import type { FieldModel } from '../../../../editor/entity-inspector/index.ts';
import { Icon } from '../../../shared/index.ts';
import { ChoiceField } from '../../ChoiceField/index.ts';
import type { FieldSubject } from '../../FieldProps.ts';
import { innerFieldOf, innerPropsOf } from '../../inner-fields/innerField.ts';
import { VectorField } from '../../VectorField/index.ts';
import { PathHandleRow } from './PathHandleRow/index.ts';
import './PathPointRow.css';

const POSITION_TYPE = new VectorFieldType();
const CORNER_TYPE = new ChoiceFieldType<PathCorner>([
    { value: 'sharp', label: 'Sharp' },
    { value: 'smooth', label: 'Smooth' },
    { value: 'separate', label: 'Separate' },
]);

export type PathPointRowProps = {
    field: FieldModel;
    subject: FieldSubject;
    point: PathPoint;
    index: number;
    isUnfolded: boolean;
    // Selected in the level view: the blue pill.
    isSelected: boolean;
    onToggleFold: (index: number) => void;
    onCommit: (index: number, point: PathPoint) => void;
};

// One point of a path: its number, a fold arrow, its position and its corner, and unfolded its Handle in
// and Handle out. A sharp point has no handles, so no arrow. Choosing Sharp drops the handles, and Smooth
// or Separate on a sharp point gives it some: the path's write does both. A point selected in the level
// view is the blue pill.
export function PathPointRow(props: PathPointRowProps) {
    const { field, subject, point, index, isUnfolded, isSelected, onToggleFold, onCommit } = props;
    const number = index + 1;
    const hasHandles = point.corner !== 'sharp';
    const showsHandles = hasHandles && isUnfolded;

    const position = { x: point.x, y: point.y };
    const positionOptions = {
        key: `${index}.position`,
        label: `Point ${number}`,
        type: POSITION_TYPE,
        unit: 'px',
    } as const;
    const positionField = innerFieldOf(field, positionOptions, position);
    const commitPosition = (value: unknown) => {
        const { x, y } = value as Point;
        onCommit(index, { ...point, x, y });
    };

    const cornerOptions = { key: `${index}.corner`, label: `Corner of point ${number}`, type: CORNER_TYPE };
    const cornerField = innerFieldOf(field, cornerOptions, point.corner);
    const commitCorner = (value: unknown) => onCommit(index, { ...point, corner: value as PathCorner });

    const commitHandleIn = (handleIn: Point) => onCommit(index, { ...point, handleIn });
    const commitHandleOut = (handleOut: Point) => onCommit(index, { ...point, handleOut });

    const positionProps = innerPropsOf(subject, positionField, commitPosition);
    const cornerProps = innerPropsOf(subject, cornerField, commitCorner);
    const toggleFold = () => onToggleFold(index);
    const handleRowProps = { field, subject, pointIndex: index };

    return (
        <div className="path-point-row" data-index={index} data-unfolded={showsHandles} data-selected={isSelected}>
            <div className="point">
                <span className="number">{number}</span>
                {hasHandles && <FoldButton number={number} isUnfolded={isUnfolded} onToggle={toggleFold} />}
                {!hasHandles && <span className="no-fold" />}
                <span className="position">
                    <VectorField {...positionProps} />
                </span>
                <span className="corner">
                    <ChoiceField {...cornerProps} />
                </span>
            </div>
            {showsHandles && (
                <PathHandleRow {...handleRowProps} name="handleIn" handle={point.handleIn} onCommit={commitHandleIn} />
            )}
            {showsHandles && (
                <PathHandleRow
                    {...handleRowProps}
                    name="handleOut"
                    handle={point.handleOut}
                    onCommit={commitHandleOut}
                />
            )}
        </div>
    );
}

type FoldButtonProps = {
    number: number;
    isUnfolded: boolean;
    onToggle: () => void;
};

function FoldButton({ number, isUnfolded, onToggle }: FoldButtonProps) {
    const icon = isUnfolded ? ChevronDown : ChevronRight;
    const label = `Handles of point ${number}`;

    return (
        <button type="button" className="fold" aria-label={label} aria-expanded={isUnfolded} onClick={onToggle}>
            <Icon icon={icon} size="small" />
        </button>
    );
}
