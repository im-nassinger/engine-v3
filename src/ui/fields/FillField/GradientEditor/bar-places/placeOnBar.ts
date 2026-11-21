// The bar's places are whole percents, as the Place field shows them.
const PLACES = 100;

// Where along the bar a pointer is, from 0 at its left end to 1 at its right, kept on the bar.
export function placeOnBar(clientX: number, bar: DOMRect) {
    const share = (clientX - bar.left) / bar.width;
    const keptShare = Math.min(Math.max(share, 0), 1);

    return Math.round(keptShare * PLACES) / PLACES;
}
