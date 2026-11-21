import { useEffect, useRef } from 'react';
import type { PointerEvent } from 'react';
import { withStopChanged } from '../../../../../core/fields/index.ts';
import type { ColourStop, EditedStops } from '../../../../../core/fields/index.ts';
import { placeOnBar } from './placeOnBar.ts';

// How far the pointer moves before a press on a stop is a drag and not a click.
const DRAG_DISTANCE = 3;

export type StopDragOptions = {
    stops: readonly ColourStop[];
    isDisabled: boolean;
    onChoose: (index: number) => void;
    // Each move, with the stops re-sorted and where the dragged one went.
    onSlide: (edited: EditedStops) => void;
    // The release after a drag, with the index the stop had when pressed.
    onRelease: (edited: EditedStops, startIndex: number) => void;
};

// A stop's swatch pressed chooses it; dragged along the swatches' row, it moves to the place under the
// pointer. The click that ends a drag chooses nothing more, since the stop may have moved past another.
export function useStopDrag({ stops, isDisabled, onChoose, onSlide, onRelease }: StopDragOptions) {
    const wasDragged = useRef(false);
    // Takes the window's listeners away, for a drag still running when the editor goes.
    const endDrag = useRef<(() => void) | undefined>(undefined);

    useEffect(() => {
        return () => endDrag.current?.();
    }, []);

    const handlePointerDown = (event: PointerEvent<HTMLElement>, index: number) => {
        const row = event.currentTarget.parentElement;
        const pressedStop = stops[index];
        if (event.button !== 0 || isDisabled || row === null || pressedStop === undefined) return;

        onChoose(index);
        wasDragged.current = false;
        const startX = event.clientX;
        let edited: EditedStops | undefined;

        const move = (moveEvent: globalThis.PointerEvent) => {
            const isDragging = edited !== undefined || Math.abs(moveEvent.clientX - startX) >= DRAG_DISTANCE;
            if (!isDragging) return;

            const rowBox = row.getBoundingClientRect();
            const place = placeOnBar(moveEvent.clientX, rowBox);
            edited = withStopChanged(stops, index, { ...pressedStop, place });
            onSlide(edited);
        };

        const stop = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', release);
            window.removeEventListener('pointercancel', release);
            endDrag.current = undefined;
        };

        const release = () => {
            stop();
            if (edited === undefined) return;

            wasDragged.current = true;
            onRelease(edited, index);
        };

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', release);
        window.addEventListener('pointercancel', release);
        endDrag.current = stop;
    };

    // A click without a press first, from the keyboard, chooses the stop too.
    const handleClick = (index: number) => {
        if (wasDragged.current) {
            wasDragged.current = false;
            return;
        }

        onChoose(index);
    };

    return { onPointerDown: handlePointerDown, onClick: handleClick };
}
