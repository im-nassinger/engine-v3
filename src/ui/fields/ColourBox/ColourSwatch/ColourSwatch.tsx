import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import './ColourSwatch.css';

export type ColourSwatchProps = {
    label: string;
    // #RRGGBBAA, or undefined for Mixed and None.
    colour: string | undefined;
    isNone: boolean;
    isDisabled: boolean;
    // The browser's #rrggbb.
    onPick: (pickedRgb: string) => void;
};

const NO_COLOUR_RGB = '#000000';

// The 14 px square of the colour, which opens the browser's colour picker. A pick commits once, on the
// browser's change event, whatever the dragging inside the picker: input comes with every move.
export function ColourSwatch({ label, colour, isNone, isDisabled, onPick }: ColourSwatchProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    let pickerRgb = NO_COLOUR_RGB;
    if (colour !== undefined) {
        pickerRgb = colour.slice(0, 7).toLowerCase();
    }

    useEffect(() => {
        const input = inputRef.current;
        if (input === null) return;

        input.value = pickerRgb;
    }, [pickerRgb]);

    useEffect(() => {
        const input = inputRef.current;
        if (input === null) return;

        const pick = () => onPick(input.value);
        input.addEventListener('change', pick);

        return () => input.removeEventListener('change', pick);
    }, [onPick]);

    const swatchStyle = { '--swatch': colour ?? 'transparent' } as CSSProperties;

    return (
        <span className="colour-swatch" data-none={isNone} data-empty={colour === undefined} style={swatchStyle}>
            <input
                ref={inputRef}
                type="color"
                aria-label={`${label} picker`}
                defaultValue={pickerRgb}
                disabled={isDisabled}
            />
        </span>
    );
}
