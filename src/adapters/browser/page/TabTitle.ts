import type { Unsubscribe } from '../../../core/events/index.ts';
import { GAME_NAME } from '../../../editor/commands/index.ts';
import type { SaveIndicator } from '../../../editor/saving/index.ts';
import type { EditorSession } from '../../../editor/session/index.ts';

// "castle - engine-v3", with `*` in front while the level has unsaved changes.
export function tabTitleText(levelName: string, hasUnsavedChanges: boolean) {
    const mark = hasUnsavedChanges ? '*' : '';

    return `${mark}${levelName} - ${GAME_NAME}`;
}

// The browser tab's title follows the open level's name and the save state.
export class TabTitle {
    private readonly session: EditorSession;
    private readonly indicator: SaveIndicator;
    private readonly page: Document;

    constructor(session: EditorSession, indicator: SaveIndicator, page: Document) {
        this.session = session;
        this.indicator = indicator;
        this.page = page;
    }

    connect(): Unsubscribe {
        let stopName = this.followName();
        const stopLevel = this.session.openLevelChanged.subscribe(() => {
            stopName();
            stopName = this.followName();
            this.write();
        });
        const stopState = this.indicator.version.subscribe(() => this.write());
        this.write();

        return () => {
            stopName();
            stopLevel();
            stopState();
        };
    }

    private followName() {
        return this.session.openLevel.level.signals.nameVersion.subscribe(() => this.write());
    }

    private write() {
        const name = this.session.openLevel.level.name;
        this.page.title = tabTitleText(name, this.indicator.hasUnsavedChanges);
    }
}
