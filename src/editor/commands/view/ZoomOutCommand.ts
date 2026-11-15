import { MIN_ZOOM } from '../../view/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

const ZOOMED_OUT_FULLY = 'Already at 1%';

// Halves the zoom about the view's middle. Never a step.
export class ZoomOutCommand implements EditorCommand {
    readonly id = 'view.zoomOut';
    readonly label = 'Zoom out';
    readonly menu = { menu: 'View', section: 2, order: 20 } as const;
    readonly shortcuts = ['-', 'Ctrl+-'];
    readonly repeatsWhileHeld = true;
    private readonly session: EditorSession;

    constructor(session: EditorSession) {
        this.session = session;
    }

    availability(): Availability {
        if (this.isZoomedOutFully()) return { enabled: false, reason: ZOOMED_OUT_FULLY };

        return { enabled: true };
    }

    run(): CommandOutcome {
        if (this.isZoomedOutFully()) return { kind: 'refused', reason: ZOOMED_OUT_FULLY };

        this.session.view.zoomOut();

        return { kind: 'done' };
    }

    private isZoomedOutFully() {
        return this.session.view.zoom <= MIN_ZOOM;
    }
}
