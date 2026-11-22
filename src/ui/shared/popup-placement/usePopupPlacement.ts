import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';
import { placePopup } from './placePopup.ts';
import type { PopupPlacement, PopupRect } from './placePopup.ts';

// Places a popup with `position: fixed` next to its anchor before the browser paints, and again when
// anything scrolls or the window resizes, so no panel's edge cuts it and it stays inside the window. The
// most height that fits is written as `--popup-room`, for the part of the popup that scrolls. A scroll
// inside the popup itself moves no anchor and is left alone: measuring it at full height would set its
// scroll back to the top.
export function usePopupPlacement(
    popupRef: RefObject<HTMLElement | null>,
    readAnchor: () => PopupRect | undefined,
    placement: PopupPlacement,
) {
    useLayoutEffect(() => {
        const place = () => {
            const element = popupRef.current;
            const anchor = readAnchor();
            if (!element || !anchor) return;

            // Measured at its full height, not the room it or a popup around it was given.
            element.style.setProperty('--popup-room', 'none');
            const popupSize = { width: element.offsetWidth, height: element.offsetHeight };
            const windowSize = {
                width: document.documentElement.clientWidth,
                height: document.documentElement.clientHeight,
            };
            const placed = placePopup(anchor, popupSize, windowSize, placement);

            element.style.left = `${placed.left}px`;
            element.style.top = `${placed.top}px`;
            element.style.setProperty('--popup-room', `${placed.room}px`);
        };

        const placeAfterScroll = (event: Event) => {
            const scrolled = event.target;
            if (scrolled instanceof Node && popupRef.current?.contains(scrolled) === true) return;

            place();
        };

        place();
        window.addEventListener('scroll', placeAfterScroll, { capture: true, passive: true });
        window.addEventListener('resize', place);

        return () => {
            window.removeEventListener('scroll', placeAfterScroll, { capture: true });
            window.removeEventListener('resize', place);
        };
    });
}

// The anchor's box, for an anchor held in a ref.
export function rectOf(anchor: RefObject<HTMLElement | null>) {
    return anchor.current?.getBoundingClientRect();
}
