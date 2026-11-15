import type { InputHTMLAttributes } from 'react';
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
};

// The box a number is typed in, with its unit as a faded suffix inside it.
export function NumberBox({ label, axisLetter, unit, inputProps, isMixed, isRefused, isDisabled }: NumberBoxProps) {
    const placeholder = isMixed ? 'Mixed' : undefined;

    return (
        <label className="number-box" data-refused={isRefused} data-disabled={isDisabled}>
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
