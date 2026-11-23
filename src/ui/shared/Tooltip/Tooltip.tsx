import { useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { rectOf, usePopupPlacement } from '../popup-placement/index.ts';
import './Tooltip.css';

// A tooltip that appeared at once would flash over every button the mouse crosses on its way somewhere.
const SHOW_DELAY_MS = 500;
const BUBBLE_GAP_PX = 4;

export type TooltipProps = {
    label: string;
    shortcut?: string;
    // A sentence, such as a field's description: it wraps and starts at the left edge instead of the middle.
    isLong?: boolean;
    // While true no bubble shows: a menu button's, while its menu is open over the same place.
    isSuppressed?: boolean;
    children: ReactNode;
};

export function Tooltip({ label, shortcut, isLong = false, isSuppressed = false, children }: TooltipProps) {
    const [isShown, setIsShown] = useState(false);
    const rootRef = useRef<HTMLSpanElement>(null);
    const showTimer = useRef<number | undefined>(undefined);

    const cancelShowing = () => {
        window.clearTimeout(showTimer.current);
        showTimer.current = undefined;
    };

    const showSoon = () => {
        cancelShowing();
        showTimer.current = window.setTimeout(() => setIsShown(true), SHOW_DELAY_MS);
    };

    const hide = () => {
        cancelShowing();
        setIsShown(false);
    };

    useEffect(() => cancelShowing, []);

    const isBubbleShown = isShown && !isSuppressed;

    return (
        <span
            className="tooltip"
            ref={rootRef}
            data-long={isLong}
            onPointerEnter={showSoon}
            onPointerLeave={hide}
            onFocus={showSoon}
            onBlur={hide}
        >
            {children}
            {isBubbleShown && <TooltipBubble label={label} shortcut={shortcut} isLong={isLong} owner={rootRef} />}
        </span>
    );
}

type TooltipBubbleProps = {
    label: string;
    shortcut: string | undefined;
    isLong: boolean;
    owner: RefObject<HTMLSpanElement | null>;
};

// Under its owner, or over it when only that side has room, and slid along to stay inside the window.
function TooltipBubble({ label, shortcut, isLong, owner }: TooltipBubbleProps) {
    const bubbleRef = useRef<HTMLSpanElement>(null);
    const readOwner = () => rectOf(owner);
    const align = isLong ? 'start' : 'centre';
    usePopupPlacement(bubbleRef, readOwner, { side: 'below', align, gapPx: BUBBLE_GAP_PX });

    return (
        <span className="bubble" ref={bubbleRef} role="tooltip">
            {label}
            {shortcut && <span className="shortcut">{shortcut}</span>}
        </span>
    );
}
