import { useState } from 'react';
import { MAX_STOPS, withoutStop, withStopAdded, withStopChanged } from '../../../../core/fields/index.ts';
import type { ColourStop, EditedStops, GradientFill } from '../../../../core/fields/index.ts';
import type { FieldModel } from '../../../../editor/entity-inspector/index.ts';
import type { FieldSubject } from '../../FieldProps.ts';
import { AddStopButton } from './AddStopButton/index.ts';
import { GradientBar } from './GradientBar/index.ts';
import { GradientPlacement } from './GradientPlacement/index.ts';
import { GradientRow } from './GradientRow/index.ts';
import { StopEditor } from './StopEditor/index.ts';
import { StopSwatches } from './StopSwatches/index.ts';
import './GradientEditor.css';

export type GradientEditorProps = {
    field: FieldModel;
    subject: FieldSubject;
    fill: GradientFill;
    onCommit: (fill: GradientFill) => void;
};

// Under a Linear or Radial Fill: the bar, the stops' swatches, the chosen stop's fields, `+ Add stop`, and
// where the gradient lies. The chosen stop is this editor's own, followed by its index as the stops re-sort.
export function GradientEditor({ field, subject, fill, onCommit }: GradientEditorProps) {
    const [chosenIndex, setChosenIndex] = useState(0);
    const { stops } = fill;
    const shownIndex = Math.min(chosenIndex, stops.length - 1);
    const chosenStop = stops[shownIndex];
    const isDisabled = !field.isEnabled;

    const commitStops = (edited: EditedStops) => {
        setChosenIndex(edited.index);
        onCommit({ ...fill, stops: edited.stops });
    };

    const changeStop = (stop: ColourStop) => {
        const edited = withStopChanged(stops, shownIndex, stop);
        commitStops(edited);
    };

    const removeStop = () => {
        const edited = withoutStop(stops, shownIndex);
        commitStops(edited);
    };

    const addStop = () => {
        const edited = withStopAdded(stops);
        commitStops(edited);
    };

    const isFull = stops.length >= MAX_STOPS;

    return (
        <div className="gradient-editor">
            <GradientBar stops={stops} />
            <StopSwatches stops={stops} chosenIndex={shownIndex} isDisabled={isDisabled} onChoose={setChosenIndex} />
            {chosenStop && (
                <StopEditor
                    field={field}
                    subject={subject}
                    stop={chosenStop}
                    stopCount={stops.length}
                    onChange={changeStop}
                    onRemove={removeStop}
                />
            )}
            <GradientRow label="">
                <AddStopButton isDisabled={isFull || isDisabled} onAdd={addStop} />
            </GradientRow>
            <GradientPlacement field={field} subject={subject} fill={fill} onCommit={onCommit} />
        </div>
    );
}
