import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useOpenWindows } from '../../../../../open-windows/index.ts';
import { IconButton } from '../../../../../shared/index.ts';
import './TriggerWindow.css';

export type TriggerWindowProps = {
    onClose: () => void;
    // The trigger's block, drawn wider than in the card.
    children: ReactNode;
};

// One trigger in a 600 px window centred over a scrim (owner, 2026-11-26), for room to edit its script.
// Its edits are the card's own, so the card under it follows them. Esc, ✕ and a press on the scrim close it;
// a menu open inside it takes Esc first.
export function TriggerWindow({ onClose, children }: TriggerWindowProps) {
    const openWindows = useOpenWindows();
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => openWindows.open(), [openWindows]);

    useEffect(() => {
        boxRef.current?.focus();
    }, []);

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Escape') return;

        event.preventDefault();
        event.stopPropagation();
        onClose();
    };

    const pressScrim = (event: PointerEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;

        onClose();
    };

    const triggerWindow = (
        <div className="trigger-window" onKeyDown={handleKeyDown} onPointerDown={pressScrim}>
            <div ref={boxRef} className="box" role="dialog" aria-modal="true" aria-label="Trigger" tabIndex={-1}>
                <div className="title-bar">
                    <h2>Trigger</h2>
                    <IconButton icon={X} label="Close" onClick={onClose} look="quiet" />
                </div>
                <div className="body">{children}</div>
            </div>
        </div>
    );

    return createPortal(triggerWindow, document.body);
}
