import { useRef } from 'react';
import { useOpenMenu, usePopupClosing } from '../../../../shared/index.ts';
import './SaveExplanation.css';

export type SaveExplanationProps = {
    text: string;
};

// The sentence under the save state that says what it means. Esc and a press outside close it.
export function SaveExplanation({ text }: SaveExplanationProps) {
    const { close, anchor } = useOpenMenu();
    const rootRef = useRef<HTMLDivElement>(null);
    usePopupClosing(rootRef, anchor, close);

    return (
        <div className="save-explanation" ref={rootRef} role="status">
            {text}
        </div>
    );
}
