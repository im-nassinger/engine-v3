import { MAX_ZOOM } from '../../view/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { MouseOverView } from '../clipboard/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

const ZOOMED_IN_FULLY = 'Already at 1000%';

// Doubles the zoom at the mouse while it is over the level view, as the wheel does, else about the
// view's middle (from the View menu, the mouse is over the menu). Never a step. '=' is the key that holds '+' on most
// layouts, so it zooms in with or without Shift, as '-' zooms out.
export class ZoomInCommand implements EditorCommand {
    readonly id = 'view.zoomIn';
    readonly label = 'Zoom in';
    readonly menu = { menu: 'View', section: 2, order: 10 } as const;
    readonly shortcuts = ['+', '=', 'Ctrl+='];
    readonly repeatsWhileHeld = true;
    private readonly session: EditorSession;
    private readonly mouse: MouseOverView;

    constructor(session: EditorSession, mouse: MouseOverView) {
        this.session = session;
        this.mouse = mouse;
    }

    availability(): Availability {
        if (this.isZoomedInFully()) return { enabled: false, reason: ZOOMED_IN_FULLY };

        return { enabled: true };
    }

    run(): CommandOutcome {
        if (this.isZoomedInFully()) return { kind: 'refused', reason: ZOOMED_IN_FULLY };

        this.session.view.zoomIn(this.mouse.screenPosition);

        return { kind: 'done' };
    }

    private isZoomedInFully() {
        return this.session.view.zoom >= MAX_ZOOM;
    }
}
