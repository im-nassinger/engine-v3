import { useRef } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import { sliderValueAt } from './sliderValue.ts';
import type { SliderRange } from './sliderValue.ts';

// How far the pointer moves before a press on the field is a drag and not a click.
const DRAG_DISTANCE = 3;

export type FieldSliderOptions = {
    // undefined when the number has no slider.
    range: SliderRange | undefined;
    step: number;
    isDisabled: boolean;
    onSlide: (value: number) => void;
    onRelease: (value: number) => void;
};

// A number with both limits is a filled slider: dragging across the field sets the value from where
// the pointer is, changing the level while dragged and committing once when let go; a click without a
// drag types in it. A field already being typed in is left to its text.
export function useFieldSlider({ range, step, isDisabled, onSlide, onRelease }: FieldSliderOptions) {
    // Set by a drag, so the click that ends it doesn't focus the box.
    const wasDragged = useRef(false);

    const canSlide = (box: HTMLElement) => {
        if (range === undefined || isDisabled) return false;

        const input = box.querySelector('input');

        return input !== null && document.activeElement !== input;
    };

    const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
        const box = event.currentTarget;
        const input = box.querySelector('input');
        if (range === undefined || input === null || event.button !== 0 || !canSlide(box)) return;

        event.preventDefault();
        wasDragged.current = false;
        const startX = event.clientX;
        let slidValue: number | undefined;

        const move = (moveEvent: globalThis.PointerEvent) => {
            const isDragging = slidValue !== undefined || Math.abs(moveEvent.clientX - startX) >= DRAG_DISTANCE;
            if (!isDragging) return;

            const { left, width } = box.getBoundingClientRect();
            slidValue = sliderValueAt(moveEvent.clientX, left, width, range, step);
            onSlide(slidValue);
        };

        const stop = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', release);
            window.removeEventListener('pointercancel', release);
        };

        const release = () => {
            stop();
            if (slidValue === undefined) {
                input.focus();
                return;
            }

            wasDragged.current = true;
            onRelease(slidValue);
        };

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', release);
        window.addEventListener('pointercancel', release);
    };

    // The press itself never focuses the box: only a click without a drag does.
    const handleMouseDown = (event: MouseEvent<HTMLElement>) => {
        if (!canSlide(event.currentTarget)) return;

        event.preventDefault();
    };

    const handleClick = (event: MouseEvent<HTMLElement>) => {
        if (!wasDragged.current) return;

        wasDragged.current = false;
        event.preventDefault();
    };

    return {
        onPointerDown: handlePointerDown,
        onMouseDown: handleMouseDown,
        onClick: handleClick,
    };
}
