import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '../../../shared/index.ts';
import './DialogBox.css';

export type DialogBoxProps = {
    title: string;
    // Each line of the text is its own line on screen.
    text: string;
    confirmLabel: string;
    // A notice has only its confirm button.
    cancelLabel?: string;
    onConfirm: () => void;
    onClose: () => void;
};

// Centred over the scrim, the safe button first and the primary one last. The primary button takes
// the focus, so Enter answers it; Esc closes the dialog from anywhere inside it.
export function DialogBox({ title, text, confirmLabel, cancelLabel, onConfirm, onClose }: DialogBoxProps) {
    const titleId = useId();
    const textId = useId();
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const primaryButton = boxRef.current?.querySelector<HTMLButtonElement>('.buttons > :last-child');
        primaryButton?.focus();
    }, []);

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Escape') return;

        event.preventDefault();
        event.stopPropagation();
        onClose();
    };

    return (
        <div className="dialog-box" onKeyDown={handleKeyDown}>
            <div
                ref={boxRef}
                className="box"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={textId}
            >
                <h2 id={titleId}>{title}</h2>
                <p id={textId}>{text}</p>
                <div className="buttons">
                    {cancelLabel && <Button label={cancelLabel} onClick={onClose} />}
                    <Button label={confirmLabel} variant="primary" onClick={onConfirm} />
                </div>
            </div>
        </div>
    );
}
