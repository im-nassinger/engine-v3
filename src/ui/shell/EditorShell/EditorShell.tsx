import { LevelViewHost } from '../../level-view-host/index.ts';
import { FreeArea } from './FreeArea/index.ts';
import { PanelPlace } from './PanelPlace/index.ts';
import './EditorShell.css';

// The level view fills the window, and the panels sit over it in fixed places. Each place stays empty
// until the stage that builds its panel.
export function EditorShell() {
    return (
        <div className="editor-shell">
            <LevelViewHost />
            <PanelPlace area="top-bar" label="Top bar" />
            <PanelPlace area="toolbar" label="Tools" />
            <PanelPlace area="inspector" label="Inspector" />
            <FreeArea />
            <PanelPlace area="entities" label="Entities" />
            <PanelPlace area="status-bar" label="Status bar" />
        </div>
    );
}
