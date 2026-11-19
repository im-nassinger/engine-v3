import type { HTMLAttributes, InputHTMLAttributes } from 'react';
import type { Unit } from '../../../core/fields/index.ts';
import './NumberBox.css';

export type NumberBoxProps = {
    label: string;
    // A vector's box starts with its axis letter, X or Y.
    axisLetter?: string;
    unit: Unit | undefined;
    inputProps: InputHTMLAttributes<HTMLInputElement>;
    isMixed: boolean;
    isRefused: boolean;
    isDisabled: boolean;
    // A filled slider's share, from 0 to 1, and its pointer handlers. Left out for a plain box.
    slider?: NumberBoxSlider;
};

export type NumberBoxSlider = {
    readonly filledShare: number;
    readonly handlers: Pick<HTMLAttributes<HTMLElement>, 'onPointerDown' | 'onMouseDown' | 'onClick'>;
};

// The pill a number is typed in, with its unit as a faded suffix inside it. A filled slider's pill is
// filled in the soft accent from the left up to the value.
export function NumberBox({
    label,
    axisLetter,
    unit,
    inputProps,
    isMixed,
    isRefused,
    isDisabled,
    slider,
}: NumberBoxProps) {
    const placeholder = isMixed ? 'Mixed' : undefined;
    const shownText = String(inputProps.value ?? '') || (placeholder ?? '');
    const boxStyle = { '--chars': shownText.length } as Record<string, string | number>;
    if (slider !== undefined) {
        boxStyle['--filled'] = `${slider.filledShare * 100}%`;
    }

    return (
        <label
            className="number-box"
            data-refused={isRefused}
            data-disabled={isDisabled}
            data-slider={slider !== undefined}
            style={boxStyle}
            {...slider?.handlers}
        >
            {axisLetter !== undefined && <span className="axis">{axisLetter}</span>}
            <input
                {...inputProps}
                aria-label={label}
                aria-invalid={isRefused}
                inputMode="decimal"
                placeholder={placeholder}
                disabled={isDisabled}
            />
            {unit !== undefined && !isMixed && <span className="unit">{unit}</span>}
        </label>
    );
}
