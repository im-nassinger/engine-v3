import { useEffect, useRef } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';
import type { NumberInputDefinition } from '../../../../editor/entity-inspector/index.ts';
import './FieldSlider.css';

export type SliderRange = {
    readonly min: number;
    readonly max: number;
};

export type FieldSliderProps = {
    label: string;
    range: SliderRange;
    definition: NumberInputDefinition;
    // undefined when Mixed: the thumb rests at the minimum.
    value: number | undefined;
    isDisabled: boolean;
    onSlide: (value: number) => void;
    onRelease: (value: number) => void;
};

const DEFAULT_PRECISION = 2;

// The slider beside a number with both limits. It commits once, when it is let go: the browser's change
// event comes then, while input comes with every move.
export function FieldSlider({ label, range, definition, value, isDisabled, onSlide, onRelease }: FieldSliderProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const input = inputRef.current;
        if (input === null) return;

        const release = () => onRelease(Number(input.value));
        input.addEventListener('change', release);

        return () => input.removeEventListener('change', release);
    }, [onRelease]);

    const slide = (event: ChangeEvent<HTMLInputElement>) => {
        const slidValue = Number(event.target.value);
        onSlide(slidValue);
    };

    const sliderValue = value ?? range.min;
    const span = range.max - range.min;
    const filledShare = (sliderValue - range.min) / span;
    const filledPercent = `${filledShare * 100}%`;
    const fillStyle = { '--filled': filledPercent } as CSSProperties;

    const step = stepOf(definition);

    return (
        <input
            ref={inputRef}
            className="field-slider"
            type="range"
            aria-label={`${label} slider`}
            min={range.min}
            max={range.max}
            step={step}
            value={sliderValue}
            disabled={isDisabled}
            style={fillStyle}
            onChange={slide}
        />
    );
}

// The smallest change the box shows: a slider never makes a value with more decimals than the field.
function stepOf(definition: NumberInputDefinition) {
    const { type } = definition;
    if (type.kind === 'number' && type.wholeNumber) return 1;

    const precision = definition.precision ?? DEFAULT_PRECISION;
    const displayScale = definition.displayScale ?? 1;
    const shownStep = 10 ** -precision;

    return shownStep / displayScale;
}
