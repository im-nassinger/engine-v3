import type { ReactNode } from 'react';
import { PanelErrorBoundary } from '../../PanelErrorBoundary/index.ts';
import './PanelPlace.css';

export type PanelPlaceProps = {
    // Which island it is, which the shell's CSS places.
    area: string;
    label: string;
    children?: ReactNode;
};

// One island's fixed place over the level view. A panel that throws shows
// a notice in its place and leaves the others working. Its menus and tooltips are placed in the window,
// so its edges don't cut them.
export function PanelPlace({ area, label, children }: PanelPlaceProps) {
    return (
        <section className="panel-place" data-area={area} aria-label={label} data-focus-place="panel">
            <PanelErrorBoundary>{children}</PanelErrorBoundary>
        </section>
    );
}
