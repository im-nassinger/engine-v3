import { Minus } from 'lucide-react';
import { MIN_STOPS, NumberFieldType } from '../../../../../core/fields/index.ts';
import type { ColourStop } from '../../../../../core/fields/index.ts';
import type { FieldModel } from '../../../../../editor/entity-inspector/index.ts';
import { IconButton } from '../../../../shared/index.ts';
import { ColourBox } from '../../../ColourBox/index.ts';
import type { FieldSlideHandlers, FieldSubject } from '../../../FieldProps.ts';
import { NumberField } from '../../../NumberField/index.ts';
import { innerFieldOf, innerPropsOf } from '../../inner-fields/innerField.ts';
import { GradientRow } from '../GradientRow/index.ts';

export type StopEditorProps = {
    field: FieldModel;
    subject: FieldSubject;
    stop: ColourStop;
    stopCount: number;
    onChange: (stop: ColourStop) => void;
    onRemove: () => void;
    placeSlide: FieldSlideHandlers | undefined;
};

const PLACE = {
    key: 'place',
    label: 'Place',
    type: new NumberFieldType({ min: 0, max: 1 }),
    unit: '%',
    displayScale: 100,
    precision: 1,
} as const;

// The chosen stop's Colour, with `−` to remove it, and its Place as a slider from 0 to 100%. Each change is
// one step; the place's slider changes the level while dragged, through placeSlide, and commits when let go.
export function StopEditor({ field, subject, stop, stopCount, onChange, onRemove, placeSlide }: StopEditorProps) {
    const isDisabled = !field.isEnabled;
    const placeField = innerFieldOf(field, PLACE, stop.place);
    const commitPlace = (place: unknown) => onChange({ ...stop, place: place as number });
    const commitColour = (colour: string) => onChange({ ...stop, colour });
    const placeProps = { ...innerPropsOf(subject, placeField, commitPlace), slide: placeSlide };

    let removeReason: string | undefined;
    if (stopCount <= MIN_STOPS) {
        removeReason = `A gradient keeps at least ${MIN_STOPS} stops`;
    } else if (isDisabled) {
        removeReason = `${field.definition.label} doesn't apply here`;
    }

    return (
        <div className="stop-editor">
            <GradientRow label="Colour" isSub>
                <ColourBox
                    label="Stop colour"
                    colour={stop.colour}
                    noColour="Mixed"
                    isDisabled={isDisabled}
                    onCommit={commitColour}
                />
                <IconButton
                    icon={Minus}
                    label="Remove stop"
                    look="quiet"
                    disabledReason={removeReason}
                    onClick={onRemove}
                />
            </GradientRow>
            <GradientRow label="Place" isSub>
                <NumberField {...placeProps} />
            </GradientRow>
        </div>
    );
}
