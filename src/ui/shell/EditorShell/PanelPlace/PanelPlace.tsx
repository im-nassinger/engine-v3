import type { ReactNode } from 'react';
import { PanelErrorBoundary } from '../../PanelErrorBoundary/index.ts';
import './PanelPlace.css';

export type PanelPlaceProps = {
    // The shell's grid area the panel sits in.
    area: string;
    label: string;
    children?: ReactNode;
    // A bar whose menus and tooltips open over the panels below it lets them out of its place.
    letsMenusOut?: boolean;
};

// One panel's fixed place over the level view, flush with its neighbours. A panel that throws shows
// a notice in its place and leaves the others working.
export function PanelPlace({ area, label, children, letsMenusOut = false }: PanelPlaceProps) {
    const placement = { gridArea: area };

    return (
        <section
            className="panel-place"
            style={placement}
            data-lets-menus-out={letsMenusOut}
            aria-label={label}
            data-focus-place="panel"
        >
            <PanelErrorBoundary>{children}</PanelErrorBoundary>
        </section>
    );
}
