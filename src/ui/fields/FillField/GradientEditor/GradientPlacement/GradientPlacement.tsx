import {
    MAX_POSITION,
    MAX_RADIUS,
    MIN_POSITION,
    NumberFieldType,
    VectorFieldType,
} from '../../../../../core/fields/index.ts';
import type { GradientFill } from '../../../../../core/fields/index.ts';
import type { Point } from '../../../../../core/geometry/index.ts';
import type { FieldModel } from '../../../../../editor/entity-inspector/index.ts';
import type { FieldSubject } from '../../../FieldProps.ts';
import { NumberField } from '../../../NumberField/index.ts';
import { VectorField } from '../../../VectorField/index.ts';
import { innerFieldOf, innerPropsOf } from '../../inner-fields/innerField.ts';
import { GradientRow } from '../GradientRow/index.ts';

export type GradientPlacementProps = {
    field: FieldModel;
    subject: FieldSubject;
    fill: GradientFill;
    onCommit: (fill: GradientFill) => void;
};

const SHOWN_AS_PERCENT = { unit: '%', displayScale: 100, precision: 1 } as const;
const POSITION_TYPE = new VectorFieldType({ min: MIN_POSITION, max: MAX_POSITION });
// The smallest radius kept, 1%: a radius of 0 has no circle to show.
const MIN_RADIUS = 0.01;
// A minimum alone, so Radius is typed rather than slid across 1% to 2,100%.
const RADIUS = { key: 'radius', label: 'Radius', type: new NumberFieldType({ min: MIN_RADIUS }), ...SHOWN_AS_PERCENT };

// Where the gradient lies, in % of the entity's box: a linear one's Start and End, or a radial one's Centre
// and Radius. Each typed box is one step; a value past its limits is kept at the limit.
export function GradientPlacement({ field, subject, fill, onCommit }: GradientPlacementProps) {
    if (fill.kind === 'linear') {
        const commitStart = (start: Point) => onCommit({ ...fill, start });
        const commitEnd = (end: Point) => onCommit({ ...fill, end });

        return (
            <div className="gradient-placement">
                <PositionRow
                    field={field}
                    subject={subject}
                    name="start"
                    label="Start"
                    point={fill.start}
                    onCommit={commitStart}
                />
                <PositionRow
                    field={field}
                    subject={subject}
                    name="end"
                    label="End"
                    point={fill.end}
                    onCommit={commitEnd}
                />
            </div>
        );
    }

    const commitCentre = (centre: Point) => onCommit({ ...fill, centre });
    const radiusField = innerFieldOf(field, RADIUS, fill.radius);
    const commitRadius = (radius: unknown) => {
        const keptRadius = Math.min(radius as number, MAX_RADIUS);
        onCommit({ ...fill, radius: keptRadius });
    };

    return (
        <div className="gradient-placement">
            <PositionRow
                field={field}
                subject={subject}
                name="centre"
                label="Centre"
                point={fill.centre}
                onCommit={commitCentre}
            />
            <GradientRow label="Radius">
                <NumberField {...innerPropsOf(subject, radiusField, commitRadius)} />
            </GradientRow>
        </div>
    );
}

type PositionRowProps = {
    field: FieldModel;
    subject: FieldSubject;
    name: string;
    label: string;
    point: Point;
    onCommit: (point: Point) => void;
};

function PositionRow({ field, subject, name, label, point, onCommit }: PositionRowProps) {
    const options = { key: name, label, type: POSITION_TYPE, ...SHOWN_AS_PERCENT };
    const positionField = innerFieldOf(field, options, point);
    const commit = (value: unknown) => onCommit(value as Point);

    return (
        <GradientRow label={label}>
            <VectorField {...innerPropsOf(subject, positionField, commit)} />
        </GradientRow>
    );
}
