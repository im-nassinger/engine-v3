import type { PlaySession } from '../../play/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

// Ctrl+Enter and the toolbar's one button: Play, or Stop while a run is going. Everywhere, so a field
// being typed in is committed first and the run starts from what is on screen.
export class PlayOrStopCommand implements EditorCommand {
    readonly id = 'play.playOrStop';
    readonly menu = { menu: 'Play', section: 1, order: 10 } as const;
    readonly shortcuts = ['Ctrl+Enter'];
    readonly shortcutScope = 'everywhere';
    readonly runsDuringPlay = true;
    private readonly play: PlaySession;

    constructor(play: PlaySession) {
        this.play = play;
    }

    get label() {
        return this.play.isRunGoing ? 'Stop' : 'Play';
    }

    availability(): Availability {
        return { enabled: true };
    }

    run(): CommandOutcome {
        this.play.playOrStop();

        return { kind: 'done' };
    }
}
