import type { PlaySession } from '../../play/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

// Shift+T, Ctrl+Enter and the toolbar's one button: Play, or Stop while a run is going. Ctrl+Enter
// works everywhere, so a field being typed in is committed first and the run starts from what is on
// screen; Shift+T works where the single-letter keys do, and types a T in a field. During play the
// editor takes both before the game, so a level can't use Shift+T as an input.
export class PlayOrStopCommand implements EditorCommand {
    readonly id = 'play.playOrStop';
    readonly menu = { menu: 'Play', section: 1, order: 10 } as const;
    readonly shortcuts = ['Shift+T', 'Ctrl+Enter'];
    readonly shortcutScope = 'everywhere';
    readonly shortcutScopes = { 'Shift+T': 'editor' } as const;
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
