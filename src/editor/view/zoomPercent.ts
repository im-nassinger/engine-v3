import { MAX_ZOOM, MIN_ZOOM } from './ViewState.ts';

const PERCENT = 100;
// '250', '250%', ' 12.5 % ', but not '', '%' or '1e3'.
const PERCENT_TEXT = /^\s*(\d+(?:[.,]\d+)?)\s*%?\s*$/;

// What the top bar's zoom shows: the zoom as a whole percentage.
export function zoomPercentText(zoom: number) {
    const percent = Math.round(zoom * PERCENT);

    return `${percent}%`;
}

// A typed percentage as a zoom, clamped to 1% to 1000%. Undefined when the text isn't a number.
// A comma counts as the decimal point, as many layouts type it.
export function zoomFromPercentText(text: string) {
    const match = PERCENT_TEXT.exec(text);
    if (match === null) return undefined;

    const digits = match[1] ?? '';
    const percent = Number(digits.replace(',', '.'));
    const zoom = percent / PERCENT;

    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}
