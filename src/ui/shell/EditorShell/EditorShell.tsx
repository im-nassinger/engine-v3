import { DebugBox } from '../../debug-box/index.ts';
import { Dialogs } from '../../dialogs/index.ts';
import { EntitiesViewer } from '../../entities-viewer/index.ts';
import { EntityInspector } from '../../entity-inspector/index.ts';
import { LevelViewHost } from '../../level-view-host/index.ts';
import { MainMenu } from '../../main-menu/index.ts';
import { MessagePill } from '../../message-pill/index.ts';
import { Minimap } from '../../minimap/index.ts';
import { usePlaySession } from '../../play/index.ts';
import { PlayBar } from '../../play-bar/index.ts';
import { ToolColumn } from '../../tool-column/index.ts';
import { useEditorSession } from '../../EditorContext.tsx';
import { useReading, useVersion } from '../../hooks/index.ts';
import { useEditorTools } from '../../tools/index.ts';
import { PanelErrorBoundary } from '../PanelErrorBoundary/index.ts';
import { FreeArea } from './FreeArea/index.ts';
import { PanelPlace } from './PanelPlace/index.ts';
import './EditorShell.css';

// The tools whose kinds menu stands where the Entity inspector is: the Shape tool's (owner, 2026-11-15) and
// the Joint tool's (standing yes, 2026-11-19), and the Pencil's. The pen and the Trigger tool have no menu but hide it
// too, as the v2 and v3 designs say.
const HIDES_ENTITY_INSPECTOR: ReadonlySet<string> = new Set(['shape', 'joint', 'pen', 'pencil', 'trigger']);

// The level view fills the window, and the islands float over it in fixed places: ☰ at the top left, the
// tool column under it, the Entity inspector beside them. While the Shape or Joint tool, the pen, the Pencil or
// the Trigger tool is active the Entity inspector's island is gone and the free area reaches the tool column. With nothing
// selected the island is gone too, but the free area stays, so selecting doesn't move what fitting frames (owner, 2026-11-19). During test play
// every panel and bar is hidden but kept, so Stop shows them as they were, scrolled and folded, and the Play bar floats
// over the game.
export function EditorShell() {
    // The session gives a new open level after New or Import while the session object stays the same, so the
    // React Compiler must not keep the old level's selection.
    'use no memo';

    const { controller } = useEditorTools();
    const play = usePlaySession();
    const session = useEditorSession();
    useVersion(session.openLevelChanged);
    const selection = session.openLevel.selection;
    const readEntityInspectorHidden = () => HIDES_ENTITY_INSPECTOR.has(controller.active.id);
    const isEntityInspectorHidden = useReading(controller.version, readEntityInspectorHidden);
    const readNothingSelected = () => selection.isEmpty;
    const isNothingSelected = useReading(selection.version, readNothingSelected);
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
            <PanelPlace area="tool-column" label="Tools">
                <ToolColumn />
            </PanelPlace>
            {!isEntityInspectorHidden && !isNothingSelected && (
                <PanelPlace area="entity-inspector" label="Entity inspector">
                    <EntityInspector />
                </PanelPlace>
            )}
            <FreeArea />
            <PanelPlace area="entities-viewer" label="Entities viewer">
                <EntitiesViewer />
            </PanelPlace>
            <PanelPlace area="minimap" label="Minimap">
                <Minimap />
            </PanelPlace>
            <PanelPlace area="debug-box" label="Debug box">
                <DebugBox />
            </PanelPlace>
            <PanelErrorBoundary>
                <MessagePill />
            </PanelErrorBoundary>
            <PanelErrorBoundary>
                <Dialogs />
            </PanelErrorBoundary>
        </div>
    );
}
