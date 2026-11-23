import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

// Zooms to 100%, one level pixel per CSS pixel, about the view's middle. Never a step.
export class ZoomToActualSizeCommand implements EditorCommand {
    readonly id = 'view.zoomTo100';
    readonly label = '100%';
    readonly menu = { menu: 'View', section: 2, order: 30 } as const;
    readonly shortcuts = ['Shift+0'];
    readonly shortcutName = 'Zoom to 100%';
    private readonly session: EditorSession;

    constructor(session: EditorSession) {
        this.session = session;
    }

    availability(): Availability {
        return { enabled: true };
    }

    run(): CommandOutcome {
        this.session.view.zoomAboutMiddle(1);

        return { kind: 'done' };
    }
}
