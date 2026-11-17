// Where a popup (a menu, a submenu, a tooltip, an explanation) goes in the window, so all of it shows:
// on its preferred side of its anchor when that side has room, on the other side when only that one has,
// and slid along the anchor's edge to stay inside the window. A popup taller than either side's room
// keeps the larger side and scrolls inside `room`.

export type PopupRect = {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
};

export type PopupSize = {
    readonly width: number;
    readonly height: number;
};

// Below or above opens under or over the anchor; beside opens to its right, or its left with align end.
export type PopupSide = 'below' | 'above' | 'beside';

// Which of the anchor's edges the popup lines up with: start is the left (or the top, beside), end the
// right, and centre the middle.
export type PopupAlign = 'start' | 'end' | 'centre';

export type PopupPlacement = {
    readonly side: PopupSide;
    readonly align: PopupAlign;
    // The space between the anchor and the popup.
    readonly gapPx: number;
};

export type PlacedPopup = {
    readonly left: number;
    readonly top: number;
    // The most height that fits on the side chosen; a taller popup scrolls.
    readonly room: number;
};

// The space a popup keeps from the window's edges.
export const WINDOW_MARGIN_PX = 4;

export function placePopup(anchor: PopupRect, popup: PopupSize, window: PopupSize, placement: PopupPlacement) {
    if (placement.side === 'beside') return placeBeside(anchor, popup, window, placement);

    return placeOverOrUnder(anchor, popup, window, placement);
}

function placeOverOrUnder(anchor: PopupRect, popup: PopupSize, window: PopupSize, placement: PopupPlacement) {
    const roomBelow = window.height - WINDOW_MARGIN_PX - anchor.bottom - placement.gapPx;
    const roomAbove = anchor.top - placement.gapPx - WINDOW_MARGIN_PX;
    const opensBelow = choosesFirstSide(placement.side === 'below', roomBelow, roomAbove, popup.height);

    let top = anchor.bottom + placement.gapPx;
    let room = roomBelow;
    if (!opensBelow) {
        const shownHeight = Math.min(popup.height, roomAbove);
        top = anchor.top - placement.gapPx - shownHeight;
        room = roomAbove;
    }

    const wantedLeft = alignedStart(anchor.left, anchor.right, popup.width, placement.align);
    const left = keepInside(wantedLeft, popup.width, window.width);

    return { left, top, room: Math.max(room, 0) } satisfies PlacedPopup;
}

function placeBeside(anchor: PopupRect, popup: PopupSize, window: PopupSize, placement: PopupPlacement) {
    const roomRight = window.width - WINDOW_MARGIN_PX - anchor.right - placement.gapPx;
    const roomLeft = anchor.left - placement.gapPx - WINDOW_MARGIN_PX;
    const opensRight = choosesFirstSide(placement.align !== 'end', roomRight, roomLeft, popup.width);

    let left = anchor.right + placement.gapPx;
    if (!opensRight) {
        left = anchor.left - placement.gapPx - popup.width;
    }

    const room = window.height - 2 * WINDOW_MARGIN_PX;
    const shownHeight = Math.min(popup.height, room);
    const top = keepInside(anchor.top, shownHeight, window.height);

    const keptLeft = keepInside(left, popup.width, window.width);

    return { left: keptLeft, top, room } satisfies PlacedPopup;
}

// The preferred side when the popup fits there or the other side has no more room.
function choosesFirstSide(prefersFirst: boolean, roomFirst: number, roomSecond: number, length: number) {
    if (prefersFirst) {
        const fitsFirst = length <= roomFirst;
        return fitsFirst || roomFirst >= roomSecond;
    }

    const fitsSecond = length <= roomSecond;
    return !(fitsSecond || roomSecond >= roomFirst);
}

function alignedStart(anchorStart: number, anchorEnd: number, length: number, align: PopupAlign) {
    if (align === 'start') return anchorStart;
    if (align === 'end') return anchorEnd - length;

    const anchorMiddle = (anchorStart + anchorEnd) / 2;
    return anchorMiddle - length / 2;
}

// Slides a popup along one axis into the window, keeping its start in when it is longer than the window.
function keepInside(start: number, length: number, windowLength: number) {
    const lastStart = windowLength - WINDOW_MARGIN_PX - length;
    const limitedStart = Math.min(start, lastStart);

    return Math.max(limitedStart, WINDOW_MARGIN_PX);
}
