import { useRef } from 'react';
import { rectOf, useOpenMenu, usePopupClosing, usePopupPlacement } from '../../../shared/index.ts';
import './SaveExplanation.css';

export type SaveExplanationProps = {
    text: string;
};

const EXPLANATION_GAP_PX = 4;

// The sentence over the save state, at the window's bottom until stage 19 step 12 removes it, that says
// what it means. Esc and a press outside close it.
export function SaveExplanation({ text }: SaveExplanationProps) {
    const { close, anchor } = useOpenMenu();
    const rootRef = useRef<HTMLDivElement>(null);
    usePopupClosing(rootRef, anchor, close);

    const readAnchor = () => rectOf(anchor);
    usePopupPlacement(rootRef, readAnchor, { side: 'above', align: 'start', gapPx: EXPLANATION_GAP_PX });

    return (
        <div className="save-explanation" ref={rootRef} role="status">
            {text}
        </div>
    );
}
