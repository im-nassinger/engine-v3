import { DEFAULT_PIXELS_PER_METRE } from '../../core/components/index.ts';
import type { Unit } from '../../core/fields/index.ts';

import type { LengthUnit } from './LengthUnit.ts';

// What a number shown with a unit carries: a field's definition, a trigger block's number box.
export type ShownNumber = {
    readonly unit?: Unit;
    readonly displayScale?: number;
    readonly precision?: number;
};

const METRE_UNITS: Partial<Record<Unit, Unit>> = { px: 'm', 'px/s': 'm/s' };
const DEFAULT_PRECISION = 2;
// Enough digits for any stored value, few enough to drop the float noise of a conversion (0.07 / 0.01).
const FULL_VALUE_DIGITS = 15;

// Turns the stored pixels of every length and speed into the chosen unit and back. In metres, px becomes m
// and px/s m/s, divided by the World's Pixels per metre, with as many more decimals as one pixel needs, so
// a value shows as finely as it did in pixels. In pixels everything shows as stored.
export class LengthDisplay {
    static readonly inPixels = new LengthDisplay('pixels', DEFAULT_PIXELS_PER_METRE);

    readonly unit: LengthUnit;
    readonly pixelsPerMetre: number;

    constructor(unit: LengthUnit, pixelsPerMetre: number) {
        this.unit = unit;
        this.pixelsPerMetre = pixelsPerMetre;
    }

    get isMetres() {
        return this.unit === 'metres';
    }

    // The unit a length is labelled with: m or px.
    get lengthUnit(): Unit {
        return this.isMetres ? 'm' : 'px';
    }

    // The same definition as the chosen unit shows it; one whose unit isn't a length or a speed as it is.
    shown<Shown extends ShownNumber>(definition: Shown): Shown {
        if (!this.isMetres) return definition;

        const unit = definition.unit;
        if (unit === undefined) return definition;

        const metreUnit = METRE_UNITS[unit];
        if (metreUnit === undefined) return definition;

        const displayScale = (definition.displayScale ?? 1) / this.pixelsPerMetre;
        const precision = (definition.precision ?? DEFAULT_PRECISION) + this.extraDecimals();

        return { ...definition, unit: metreUnit, displayScale, precision };
    }

    // A stored length in the chosen unit, in full.
    toShown(pixels: number) {
        if (!this.isMetres) return pixels;

        const metres = pixels / this.pixelsPerMetre;
        return withoutNoise(metres);
    }

    // A length typed in the chosen unit as stored pixels: 0.07 m is exactly 7 px at 100 px per metre.
    toPixels(shown: number) {
        if (!this.isMetres) return shown;

        const pixels = shown * this.pixelsPerMetre;
        return withoutNoise(pixels);
    }

    // A stored length as text, rounded to whole pixels or to the metres one pixel needs, without trailing zeros.
    lengthText(pixels: number) {
        const decimals = this.isMetres ? this.extraDecimals() : 0;
        const shown = this.toShown(pixels);
        const fixedText = shown.toFixed(decimals);

        return String(Number(fixedText) + 0);
    }

    // A width and a height as a label in the level view shows them: "19.2 × 10.8 m", or "1920 × 1080" in pixels.
    sizeText(width: number, height: number) {
        const widthText = this.lengthText(width);
        const heightText = this.lengthText(height);
        const size = `${widthText} × ${heightText}`;
        if (!this.isMetres) return size;

        return `${size} m`;
    }

    // 2 at 100 px per metre: 0.01 m is one pixel.
    private extraDecimals() {
        const digits = Math.ceil(Math.log10(this.pixelsPerMetre));

        return Math.max(digits, 0);
    }
}

export function withoutNoise(value: number) {
    const fullText = value.toPrecision(FULL_VALUE_DIGITS);

    return Number(fullText);
}
