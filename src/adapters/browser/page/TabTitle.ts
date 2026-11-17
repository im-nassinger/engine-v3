import type { Unsubscribe } from '../../../core/events/index.ts';
import { GAME_NAME } from '../../../editor/commands/index.ts';
import type { PlaySession } from '../../../editor/play/index.ts';
import type { SaveIndicator } from '../../../editor/saving/index.ts';
import type { EditorSession } from '../../../editor/session/index.ts';

type RunShown = Pick<PlaySession, 'isRunGoing' | 'version'>;

const RUN_MARK = '▶ ';

// "castle - engine-v3", with `*` in front while the level has unsaved changes, and `▶ ` in front of
// that while a run is going.
export function tabTitleText(levelName: string, hasUnsavedChanges: boolean, isRunGoing = false) {
    const runMark = isRunGoing ? RUN_MARK : '';
    const mark = hasUnsavedChanges ? '*' : '';

    return `${runMark}${mark}${levelName} - ${GAME_NAME}`;
}

// The browser tab's title follows the open level's name, the save state and test play.
export class TabTitle {
    private readonly session: EditorSession;
    private readonly indicator: SaveIndicator;
    private readonly page: Document;
    private readonly play: RunShown | undefined;

    constructor(session: EditorSession, indicator: SaveIndicator, page: Document, play?: RunShown) {
        this.session = session;
        this.indicator = indicator;
        this.page = page;
        this.play = play;
    }

    connect(): Unsubscribe {
        let stopName = this.followName();
        const stopLevel = this.session.openLevelChanged.subscribe(() => {
            stopName();
            stopName = this.followName();
            this.write();
        });
        const stopState = this.indicator.version.subscribe(() => this.write());
        const stopPlay = this.play?.version.subscribe(() => this.write());
        this.write();

        return () => {
            stopName();
            stopLevel();
            stopState();
            stopPlay?.();
        };
    }

    private followName() {
        return this.session.openLevel.level.signals.nameVersion.subscribe(() => this.write());
    }

    private write() {
        const name = this.session.openLevel.level.name;
        const isRunGoing = this.play?.isRunGoing === true;
        const title = tabTitleText(name, this.indicator.hasUnsavedChanges, isRunGoing);
        if (title === this.page.title) return;

        this.page.title = title;
    }
}
