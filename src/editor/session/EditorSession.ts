import { createV1Registry } from '../../core/components/index.ts';
import type { Level } from '../../core/level/index.ts';
import { FormatUpgrader, LevelReader, V1_LEVEL_LIMITS } from '../../core/level-data/index.ts';
import { VersionCounter } from '../../core/events/index.ts';
import { StatusText } from '../status/index.ts';
import type { Clock, Timer } from '../time/index.ts';
import { ViewSettings, ViewState } from '../view/index.ts';

import { OpenLevel } from './OpenLevel.ts';

export type EditorSessionOptions = {
    readonly level: Level;
    readonly clock: Clock;
    readonly timer: Timer;
    readonly viewSettings?: ViewSettings;
    // Reads removed entities back on undo. The v1 reader when left out.
    readonly reader?: LevelReader;
};

// The editor's root object, built once by the page with every contract passed in. Tests build it with
// fakes. The commands are built on top of it (createCommandRegistry), not held by it.
export class EditorSession {
    readonly view = new ViewState();
    readonly viewSettings: ViewSettings;
    readonly reader: LevelReader;
    readonly status: StatusText;
    readonly openLevelChanged = new VersionCounter();
    private readonly clock: Clock;
    private current: OpenLevel;

    constructor(options: EditorSessionOptions) {
        this.clock = options.clock;
        this.viewSettings = options.viewSettings ?? new ViewSettings();
        this.reader = options.reader ?? createV1Reader();
        this.status = new StatusText(options.timer);
        this.current = new OpenLevel(options.level, options.clock);
    }

    get openLevel() {
        return this.current;
    }

    // New, Import and loading the saved level: a fresh history, selection and current group.
    replaceOpenLevel(level: Level) {
        this.current.dispose();
        this.current = new OpenLevel(level, this.clock);
        this.openLevelChanged.increment();
    }
}

function createV1Reader() {
    const registry = createV1Registry();
    const upgrader = FormatUpgrader.createV1();

    return new LevelReader(registry, V1_LEVEL_LIMITS, upgrader);
}
