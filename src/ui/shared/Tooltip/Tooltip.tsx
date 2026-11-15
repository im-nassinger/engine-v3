import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import './Tooltip.css';

// A tooltip that appeared at once would flash over every button the mouse crosses on its way somewhere.
const SHOW_DELAY_MS = 500;

export type TooltipProps = {
    label: string;
    shortcut?: string;
    children: ReactNode;
};

export function Tooltip({ label, shortcut, children }: TooltipProps) {
    const [isShown, setIsShown] = useState(false);
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

    return (
        <span className="tooltip" onPointerEnter={showSoon} onPointerLeave={hide} onFocus={showSoon} onBlur={hide}>
            {children}
            {isShown && <TooltipBubble label={label} shortcut={shortcut} />}
        </span>
    );
}

type TooltipBubbleProps = {
    label: string;
    shortcut: string | undefined;
};

function TooltipBubble({ label, shortcut }: TooltipBubbleProps) {
    return (
        <span className="bubble" role="tooltip">
            {label}
            {shortcut && <span className="shortcut">{shortcut}</span>}
        </span>
    );
}
