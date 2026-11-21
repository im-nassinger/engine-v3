import type { ReactNode } from 'react';
import './GradientRow.css';

export type GradientRowProps = {
    // Empty for a row with no label, such as `+ Add stop`'s.
    label: string;
    // A stop's Colour and Place sit indented under the stops.
    isSub?: boolean;
    children: ReactNode;
};

// A row of the gradient editor, its label in the card's label column like any field's.
export function GradientRow({ label, isSub = false, children }: GradientRowProps) {
    return (
        <div className="gradient-row" data-sub={isSub}>
            <span className="label">{label}</span>
            <span className="value">{children}</span>
        </div>
    );
}
