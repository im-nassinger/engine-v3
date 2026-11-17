import type { PlaySession } from '../../play/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

import { NOT_PAUSED_REASON } from './playReasons.ts';

// F9 and the Play bar's button: one tick, only while paused.
export class StepCommand implements EditorCommand {
    readonly id = 'play.step';
    readonly label = 'Step';
    readonly menu = { menu: 'Play', section: 1, order: 30 } as const;
    readonly shortcuts = ['F9'];
    readonly shortcutScope = 'everywhere';
    readonly runsDuringPlay = true;
    private readonly play: PlaySession;

    constructor(play: PlaySession) {
        this.play = play;
    }

    availability(): Availability {
        if (!this.play.canStep) return { enabled: false, reason: NOT_PAUSED_REASON };

        return { enabled: true };
    }

    run(): CommandOutcome {
        this.play.step();

        return { kind: 'done' };
    }
}
