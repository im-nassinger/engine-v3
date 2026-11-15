import { Dialogs } from '../../dialogs/index.ts';
import { EntitiesPanel } from '../../entities-panel/index.ts';
import { Inspector } from '../../inspector/index.ts';
import { LevelViewHost } from '../../level-view-host/index.ts';
import { StatusBar } from '../../status-bar/index.ts';
import { Toolbar } from '../../toolbar/index.ts';
import { TopBar } from '../../top-bar/index.ts';
import { PanelErrorBoundary } from '../PanelErrorBoundary/index.ts';
import { FreeArea } from './FreeArea/index.ts';
import { PanelPlace } from './PanelPlace/index.ts';
import './EditorShell.css';

// The level view fills the window, and the panels sit over it in fixed places.
export function EditorShell() {
    return (
        <div className="editor-shell">
            <LevelViewHost />
            <PanelPlace area="top-bar" label="Top bar" letsMenusOut>
                <TopBar />
            </PanelPlace>
            <PanelPlace area="toolbar" label="Tools" letsMenusOut>
                <Toolbar />
            </PanelPlace>
            <PanelPlace area="inspector" label="Inspector">
                <Inspector />
            </PanelPlace>
            <FreeArea />
            <PanelPlace area="entities" label="Entities">
                <EntitiesPanel />
            </PanelPlace>
            <PanelPlace area="status-bar" label="Status bar">
                <StatusBar />
            </PanelPlace>
            <PanelErrorBoundary>
                <Dialogs />
            </PanelErrorBoundary>
        </div>
    );
}
