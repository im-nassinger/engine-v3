import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';
import { placePopup } from './placePopup.ts';
import type { PopupPlacement, PopupRect } from './placePopup.ts';

// Places a popup with `position: fixed` next to its anchor before the browser paints, and again when
// anything scrolls or the window resizes, so no panel's edge cuts it and it stays inside the window. The
// most height that fits is written as `--popup-room`, for the part of the popup that scrolls.
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

        place();
        window.addEventListener('scroll', place, { capture: true, passive: true });
        window.addEventListener('resize', place);

        return () => {
            window.removeEventListener('scroll', place, { capture: true });
            window.removeEventListener('resize', place);
        };
    });
}

// The anchor's box, for an anchor held in a ref.
export function rectOf(anchor: RefObject<HTMLElement | null>) {
    return anchor.current?.getBoundingClientRect();
}
