import { Dialogs } from '../../dialogs/index.ts';
import { EntitiesViewer } from '../../entities-viewer/index.ts';
import { EntityInspector } from '../../entity-inspector/index.ts';
import { LevelViewHost } from '../../level-view-host/index.ts';
import { MainMenu } from '../../main-menu/index.ts';
import { usePlaySession } from '../../play/index.ts';
import { PlayBar } from '../../play-bar/index.ts';
import { StatusBar } from '../../status-bar/index.ts';
import { Toolbar } from '../../toolbar/index.ts';
import { useReading } from '../../hooks/index.ts';
import { useEditorTools } from '../../tools/index.ts';
import { PanelErrorBoundary } from '../PanelErrorBoundary/index.ts';
import { FreeArea } from './FreeArea/index.ts';
import { PanelPlace } from './PanelPlace/index.ts';
import './EditorShell.css';

// The tool that draws something not yet an entity, which the Entity inspector can't show (owner, 2026-11-15).
const HIDES_ENTITY_INSPECTOR = 'shape';

// The level view fills the window, and the islands float over it in fixed places: ☰ at the top left, the
// tool column under it, the Entity inspector beside them. While the Shape tool is
// active the Entity inspector's island is gone and the free area reaches the tool column. The minimap's
// island is empty until step 13 of stage 19 draws it. During test play every panel
// and bar is hidden but kept, so Stop shows them as they were, scrolled and folded, and the Play bar floats
// over the game.
export function EditorShell() {
    const { controller } = useEditorTools();
    const play = usePlaySession();
    const readEntityInspectorHidden = () => controller.active.id === HIDES_ENTITY_INSPECTOR;
    const isEntityInspectorHidden = useReading(controller.version, readEntityInspectorHidden);
    const readPlaying = () => play.isRunGoing;
    const isPlaying = useReading(play.version, readPlaying);

    return (
        <div className="editor-shell" data-entity-inspector-hidden={isEntityInspectorHidden} data-playing={isPlaying}>
            <LevelViewHost />
            {isPlaying && (
                <PanelErrorBoundary>
                    <PlayBar />
                </PanelErrorBoundary>
            )}
            <PanelPlace area="main-menu" label="Main menu">
                <MainMenu />
            </PanelPlace>
            <PanelPlace area="toolbar" label="Tools">
                <Toolbar />
            </PanelPlace>
            {!isEntityInspectorHidden && (
                <PanelPlace area="entity-inspector" label="Entity inspector">
                    <EntityInspector />
                </PanelPlace>
            )}
            <FreeArea />
            <PanelPlace area="entities-viewer" label="Entities viewer">
                <EntitiesViewer />
            </PanelPlace>
            <PanelPlace area="minimap" label="Minimap" />
            <PanelPlace area="status-bar" label="Status bar">
                <StatusBar />
            </PanelPlace>
            <PanelErrorBoundary>
                <Dialogs />
            </PanelErrorBoundary>
        </div>
    );
}
