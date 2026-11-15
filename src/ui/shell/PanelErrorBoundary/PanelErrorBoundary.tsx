import { Component } from 'react';
import type { ReactNode } from 'react';
import { PanelProblem } from './PanelProblem/index.ts';

export type PanelErrorBoundaryProps = {
    children?: ReactNode;
};

type PanelErrorBoundaryState = {
    hasFailed: boolean;
};

// A panel that throws shows a notice in its place, and the rest of the editor keeps working. React
// catches a render error only in a class component, so this is the editor's one class component.
export class PanelErrorBoundary extends Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
    override state: PanelErrorBoundaryState = { hasFailed: false };

    static getDerivedStateFromError(): PanelErrorBoundaryState {
        return { hasFailed: true };
    }

    override render() {
        if (this.state.hasFailed) return <PanelProblem />;

        return this.props.children;
    }
}
