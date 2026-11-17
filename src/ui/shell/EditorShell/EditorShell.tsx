import { Dialogs } from '../../dialogs/index.ts';
import { EntitiesPanel } from '../../entities-panel/index.ts';
import { Inspector } from '../../inspector/index.ts';
import { LevelViewHost } from '../../level-view-host/index.ts';
import { usePlaySession } from '../../play/index.ts';
import { PlayBar } from '../../play-bar/index.ts';
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
// active the Inspector's place is gone and the free area reaches the toolbar. During test play every panel
// and bar is hidden but kept, so Stop shows them as they were, scrolled and folded, and the Play bar floats
// over the game.
export function EditorShell() {
    const { controller } = useEditorTools();
    const play = usePlaySession();
    const readInspectorHidden = () => controller.active.id === HIDES_INSPECTOR;
    const isInspectorHidden = useReading(controller.version, readInspectorHidden);
    const readPlaying = () => play.isRunGoing;
    const isPlaying = useReading(play.version, readPlaying);

    return (
        <div className="editor-shell" data-inspector-hidden={isInspectorHidden} data-playing={isPlaying}>
            <LevelViewHost />
            {isPlaying && (
                <PanelErrorBoundary>
                    <PlayBar />
                </PanelErrorBoundary>
            )}
            <PanelPlace area="top-bar" label="Top bar">
                <TopBar />
            </PanelPlace>
            <PanelPlace area="toolbar" label="Tools">
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
            <PanelPlace area="status-bar" label="Status bar">
                <StatusBar />
            </PanelPlace>
            <PanelErrorBoundary>
                <Dialogs />
            </PanelErrorBoundary>
        </div>
    );
}
