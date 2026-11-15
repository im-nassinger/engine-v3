import type { ReactNode } from 'react';
import './PanelPlace.css';

export type PanelPlaceProps = {
    // The shell's grid area the panel sits in.
    area: string;
    label: string;
    children?: ReactNode;
};

// One panel's fixed place over the level view, flush with its neighbours.
export function PanelPlace({ area, label, children }: PanelPlaceProps) {
    const placement = { gridArea: area };

    return (
        <section className="panel-place" style={placement} aria-label={label} data-focus-place="panel">
            {children}
        </section>
    );
}
