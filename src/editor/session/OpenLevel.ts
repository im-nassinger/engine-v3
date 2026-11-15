import type { ComponentRegistry } from '../../core/components/index.ts';
import { DerivedCaches } from '../../core/derived/index.ts';
import type { Level } from '../../core/level/index.ts';
import { EntitiesRows, RenameRequest, RowClicks, SelectionReveal } from '../entities-panel/index.ts';
import { History, LevelEditor, LiveEdit } from '../history/index.ts';
import { HitTester, LinearSpatialIndex } from '../hit-testing/index.ts';
import { InspectorModel } from '../inspector/index.ts';
import type { CardFolds } from '../inspector/index.ts';
import { createV1Rules, EditorMessages } from '../messages/index.ts';
import { Selection } from '../selection/index.ts';
import type { Clock, FrameScheduler } from '../time/index.ts';
import type { ViewSettings } from '../view/index.ts';

import { CurrentGroup } from './CurrentGroup.ts';

// What an open level is built with besides the level: the session's, shared by every level opened.
export type OpenLevelServices = {
    readonly clock: Clock;
    // The editor messages are checked once per frame.
    readonly frames: FrameScheduler;
    readonly registry: ComponentRegistry;
    readonly cardFolds: CardFolds;
    // The hit tester reads whether the camera frame and joint icons are shown.
    readonly viewSettings: ViewSettings;
};

// The level open in the editor with everything that belongs to it. New and Import replace it as one
// piece, so nothing can keep pointing at the old level's selection or history by mistake.
export class OpenLevel {
    readonly level: Level;
    // The session's, for a message's fix that adds a component by its type name.
    readonly registry: ComponentRegistry;
    readonly caches: DerivedCaches;
    readonly selection: Selection;
    readonly currentGroup: CurrentGroup;
    readonly entitiesRows: EntitiesRows;
    readonly selectionReveal: SelectionReveal;
    readonly rowClicks: RowClicks;
    readonly renameRequest = new RenameRequest();
    readonly history: History;
    readonly editor: LevelEditor;
    // A drag's values, changed live and recorded as one step on release.
    readonly liveEdit: LiveEdit;
    readonly messages: EditorMessages;
    readonly inspector: InspectorModel;
    // What is under the mouse, for the tools.
    readonly hitTester: HitTester;

    constructor(level: Level, services: OpenLevelServices) {
        this.level = level;
        this.registry = services.registry;
        this.caches = new DerivedCaches(level);
        this.selection = new Selection(level);
        this.currentGroup = new CurrentGroup(level);
        this.entitiesRows = new EntitiesRows(level);
        this.selectionReveal = new SelectionReveal(this.selection, this.entitiesRows);
        this.rowClicks = new RowClicks(this.selection, this.entitiesRows, this.selectionReveal);
        this.history = new History(services.clock);
        this.editor = new LevelEditor({
            level,
            history: this.history,
            selection: this.selection,
            currentGroup: this.currentGroup,
        });
        this.liveEdit = new LiveEdit(level, this.editor);
        this.messages = new EditorMessages(level, createV1Rules(), services.frames);
        this.inspector = new InspectorModel({
            level,
            selection: this.selection,
            caches: this.caches,
            registry: services.registry,
            folds: services.cardFolds,
            messages: this.messages,
        });
        const index = new LinearSpatialIndex(level);
        this.hitTester = new HitTester(level, this.caches, index, services.viewSettings);
    }

    // Stops everything here following the level.
    dispose() {
        this.inspector.dispose();
        this.messages.dispose();
        this.selectionReveal.dispose();
        this.entitiesRows.dispose();
        this.currentGroup.dispose();
        this.selection.dispose();
        this.caches.dispose();
    }
}
