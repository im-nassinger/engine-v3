import { createV1Registry } from '../../core/components/index.ts';
import type { ComponentRegistry } from '../../core/components/index.ts';
import type { Level } from '../../core/level/index.ts';
import { FormatUpgrader, LevelReader, V1_LEVEL_LIMITS } from '../../core/level-data/index.ts';
import { VersionCounter } from '../../core/events/index.ts';
import { CardFolds, ListFolds } from '../inspector/index.ts';
import type { FoldStore } from '../inspector/index.ts';
import { StatusText } from '../status/index.ts';
import type { Clock, FrameScheduler, Timer } from '../time/index.ts';
import { ViewSettings, ViewState } from '../view/index.ts';

import { OpenLevel } from './OpenLevel.ts';
import type { OpenLevelServices } from './OpenLevel.ts';

export type EditorSessionOptions = {
    readonly level: Level;
    readonly clock: Clock;
    readonly timer: Timer;
    readonly frames: FrameScheduler;
    readonly viewSettings?: ViewSettings;
    // The v1 components when left out.
    readonly registry?: ComponentRegistry;
    // Reads removed entities back on undo. The v1 reader, on the registry, when left out.
    readonly reader?: LevelReader;
    // Where the folded cards are kept. In memory when left out.
    readonly foldStore?: FoldStore;
};

// The editor's root object, built once by the page with every contract passed in. Tests build it with
// fakes. The commands are built on top of it (createCommandRegistry), not held by it.
export class EditorSession {
    readonly view = new ViewState();
    readonly viewSettings: ViewSettings;
    readonly registry: ComponentRegistry;
    readonly reader: LevelReader;
    readonly status: StatusText;
    // Kept across New and Import: a fold belongs to the component type, not to a level.
    readonly cardFolds: CardFolds;
    readonly listFolds = new ListFolds();
    readonly openLevelChanged = new VersionCounter();
    private readonly services: OpenLevelServices;
    private current: OpenLevel;

    constructor(options: EditorSessionOptions) {
        this.viewSettings = options.viewSettings ?? new ViewSettings();
        this.registry = options.registry ?? createV1Registry();
        this.reader = options.reader ?? createV1Reader(this.registry);
        this.status = new StatusText(options.timer);
        this.cardFolds = new CardFolds(options.foldStore);
        this.services = {
            clock: options.clock,
            frames: options.frames,
            registry: this.registry,
            cardFolds: this.cardFolds,
            viewSettings: this.viewSettings,
        };
        this.current = new OpenLevel(options.level, this.services);
    }

    get openLevel() {
        return this.current;
    }

    // New, Import and loading the saved level: a fresh history, selection and current group.
    replaceOpenLevel(level: Level) {
        this.current.dispose();
        this.current = new OpenLevel(level, this.services);
        this.openLevelChanged.increment();
    }
}

function createV1Reader(registry: ComponentRegistry) {
    const upgrader = FormatUpgrader.createV1();

    return new LevelReader(registry, V1_LEVEL_LIMITS, upgrader);
}
