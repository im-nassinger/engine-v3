import { useRef, useState } from 'react';
import { MAX_STOPS, withoutStop, withStopAdded, withStopAt, withStopChanged } from '../../../../core/fields/index.ts';
import type { ColourStop, EditedStops, GradientFill } from '../../../../core/fields/index.ts';
import type { FieldModel } from '../../../../editor/entity-inspector/index.ts';
import type { FieldSlideHandlers, FieldSubject } from '../../FieldProps.ts';
import { AddStopButton } from './AddStopButton/index.ts';
import { useStopDrag } from './bar-places/useStopDrag.ts';
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
    slide: FieldSlideHandlers | undefined;
};

// Under a Linear or Radial Fill: the bar, the stops' swatches, the chosen stop's fields, `+ Add stop`, and
// where the gradient lies. The chosen stop is this editor's own, followed by its index as the stops re-sort.
// A dragged stop changes the level as it moves, through slide, and shows where it is until let go; Esc
// puts it back, chosen again where it started.
export function GradientEditor({ field, subject, fill, onCommit, slide }: GradientEditorProps) {
    const [chosenIndex, setChosenIndex] = useState(0);
    const [draggedStops, setDraggedStops] = useState<readonly ColourStop[] | undefined>(undefined);
    // The stops and the chosen index when the Place slider's drag began, since the level changes under it.
    const placeSlideStart = useRef<EditedStops | undefined>(undefined);
    const stops = draggedStops ?? fill.stops;
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

    const addStopAt = (place: number) => {
        const edited = withStopAt(stops, place);
        commitStops(edited);
    };

    const slideStop = (edited: EditedStops) => {
        setChosenIndex(edited.index);
        setDraggedStops(edited.stops);
        slide?.slideTo({ ...fill, stops: edited.stops });
    };

    const releaseStop = (edited: EditedStops, startIndex: number) => {
        setDraggedStops(undefined);
        if (slide === undefined) {
            commitStops(edited);
            return true;
        }

        const isKept = slide.release({ ...fill, stops: edited.stops });
        if (!isKept) {
            setChosenIndex(startIndex);
        }

        return isKept;
    };

    const placeSlidTo = (place: unknown) => {
        placeSlideStart.current ??= { stops, index: shownIndex };
        const start = placeSlideStart.current;
        const startStop = start.stops[start.index];
        if (startStop === undefined) throw new Error('The Place slider moves the chosen stop.');

        return withStopChanged(start.stops, start.index, { ...startStop, place: place as number });
    };

    const placeSlide: FieldSlideHandlers | undefined = slide && {
        slideTo: (place) => {
            const edited = placeSlidTo(place);
            slideStop(edited);
        },
        release: (place) => {
            const edited = placeSlidTo(place);
            const startIndex = placeSlideStart.current?.index ?? shownIndex;
            placeSlideStart.current = undefined;

            return releaseStop(edited, startIndex);
        },
    };

    const stopDrag = useStopDrag({
        stops: fill.stops,
        isDisabled,
        onChoose: setChosenIndex,
        onSlide: slideStop,
        onRelease: releaseStop,
    });

    const isFull = stops.length >= MAX_STOPS;

    return (
        <div className="gradient-editor">
            <GradientBar stops={stops} canAdd={!isFull && !isDisabled} onAddAt={addStopAt} />
            <StopSwatches
                stops={stops}
                chosenIndex={shownIndex}
                isDisabled={isDisabled}
                onPress={stopDrag.onPointerDown}
                onClick={stopDrag.onClick}
            />
            {chosenStop && (
                <StopEditor
                    field={field}
                    subject={subject}
                    stop={chosenStop}
                    stopCount={stops.length}
                    onChange={changeStop}
                    onRemove={removeStop}
                    placeSlide={placeSlide}
                />
            )}
            <GradientRow label="">
                <AddStopButton isDisabled={isFull || isDisabled} onAdd={addStop} />
            </GradientRow>
            <GradientPlacement field={field} subject={subject} fill={fill} onCommit={onCommit} />
        </div>
    );
}
