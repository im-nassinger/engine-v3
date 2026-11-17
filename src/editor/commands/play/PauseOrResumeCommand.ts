import type { PlaySession } from '../../play/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

import { NOT_PLAYING_REASON } from './playReasons.ts';

// F8 and the Play bar's button: Pause while playing, Resume while paused.
export class PauseOrResumeCommand implements EditorCommand {
    readonly id = 'play.pauseOrResume';
    readonly menu = { menu: 'Play', section: 1, order: 20 } as const;
    readonly shortcuts = ['F8'];
    readonly shortcutScope = 'everywhere';
    readonly runsDuringPlay = true;
    private readonly play: PlaySession;

    constructor(play: PlaySession) {
        this.play = play;
    }

    get label() {
        return this.play.state === 'paused' ? 'Resume' : 'Pause';
    }

    availability(): Availability {
        const state = this.play.state;
        const canPauseOrResume = state === 'playing' || state === 'paused';
        if (!canPauseOrResume) return { enabled: false, reason: NOT_PLAYING_REASON };

        return { enabled: true };
    }

    run(): CommandOutcome {
        this.play.pauseOrResume();

        return { kind: 'done' };
    }
}
