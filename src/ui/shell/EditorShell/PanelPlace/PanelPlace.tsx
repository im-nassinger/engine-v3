import type { ReactNode } from 'react';
import { PanelErrorBoundary } from '../../PanelErrorBoundary/index.ts';
import './PanelPlace.css';

export type PanelPlaceProps = {
    // The shell's grid area the panel sits in.
    area: string;
    label: string;
    children?: ReactNode;
};

// One panel's fixed place over the level view, flush with its neighbours. A panel that throws shows
// a notice in its place and leaves the others working. Its menus and tooltips are placed in the window,
// so its edges don't cut them.
export function PanelPlace({ area, label, children }: PanelPlaceProps) {
    const placement = { gridArea: area };

    return (
        <section className="panel-place" style={placement} aria-label={label} data-focus-place="panel">
            <PanelErrorBoundary>{children}</PanelErrorBoundary>
        </section>
    );
}
