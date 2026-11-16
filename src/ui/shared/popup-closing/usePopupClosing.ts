import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useOpenWindows } from '../../open-windows/index.ts';

// For a menu or a popup opened from a button: Esc and a press outside close it, and while it is shown it
// counts as an open window, so Esc closes it and nothing else. A press on the button is left to the button,
// which closes it itself.
export function usePopupClosing(
    root: RefObject<HTMLElement | null>,
    anchor: RefObject<HTMLElement | null>,
    onClose: () => void,
) {
    const openWindows = useOpenWindows();

    useEffect(() => openWindows.open(), [openWindows]);

    useEffect(() => {
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;

            event.preventDefault();
            event.stopPropagation();
            onClose();
        };

        const closeOnPressOutside = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;

            const isInside = root.current?.contains(target) ?? false;
            const isOnAnchor = anchor.current?.contains(target) ?? false;
            if (isInside || isOnAnchor) return;

            onClose();
        };

        document.addEventListener('keydown', closeOnEscape, { capture: true });
        document.addEventListener('pointerdown', closeOnPressOutside, { capture: true });

        return () => {
            document.removeEventListener('keydown', closeOnEscape, { capture: true });
            document.removeEventListener('pointerdown', closeOnPressOutside, { capture: true });
        };
    }, [root, anchor, onClose]);
}
