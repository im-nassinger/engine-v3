import { Dialogs } from '../../dialogs/index.ts';
import { EntitiesPanel } from '../../entities-panel/index.ts';
import { Inspector } from '../../inspector/index.ts';
import { LevelViewHost } from '../../level-view-host/index.ts';
import { StatusBar } from '../../status-bar/index.ts';
import { Toolbar } from '../../toolbar/index.ts';
import { useReading } from '../../hooks/index.ts';
import { useEditorTools } from '../../tools/index.ts';
import { TopBar } from '../../top-bar/index.ts';
import { PanelErrorBoundary } from '../PanelErrorBoundary/index.ts';
import { FreeArea } from './FreeArea/index.ts';
import { PanelPlace } from './PanelPlace/index.ts';
import './EditorShell.css';

// The tool that draws something not yet an entity, which the Inspector can't show (owner, 2026-11-15).
const HIDES_INSPECTOR = 'shape';

// The level view fills the window, and the panels sit over it in fixed places. While the Shape tool is
// active the Inspector's place is gone and the free area reaches the toolbar.
export function EditorShell() {
    const { controller } = useEditorTools();
    const readInspectorHidden = () => controller.active.id === HIDES_INSPECTOR;
    const isInspectorHidden = useReading(controller.version, readInspectorHidden);

    return (
        <div className="editor-shell" data-inspector-hidden={isInspectorHidden}>
            <LevelViewHost />
            <PanelPlace area="top-bar" label="Top bar" letsMenusOut>
                <TopBar />
            </PanelPlace>
            <PanelPlace area="toolbar" label="Tools" letsMenusOut>
                <Toolbar />
            </PanelPlace>
            {!isInspectorHidden && (
                <PanelPlace area="inspector" label="Inspector">
                    <Inspector />
                </PanelPlace>
            )}
            <FreeArea />
            <PanelPlace area="entities" label="Entities">
                <EntitiesPanel />
            </PanelPlace>
            <PanelPlace area="status-bar" label="Status bar" letsMenusOut>
                <StatusBar />
            </PanelPlace>
            <PanelErrorBoundary>
                <Dialogs />
            </PanelErrorBoundary>
        </div>
    );
}
