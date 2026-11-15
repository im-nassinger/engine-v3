import { MAX_ZOOM } from '../../view/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

const ZOOMED_IN_FULLY = 'Already at 1000%';

// Doubles the zoom about the view's middle. Never a step.
export class ZoomInCommand implements EditorCommand {
    readonly id = 'view.zoomIn';
    readonly label = 'Zoom in';
    readonly menu = { menu: 'View', section: 2, order: 10 } as const;
    readonly shortcuts = ['+', 'Ctrl+='];
    private readonly session: EditorSession;

    constructor(session: EditorSession) {
        this.session = session;
    }

    availability(): Availability {
        if (this.isZoomedInFully()) return { enabled: false, reason: ZOOMED_IN_FULLY };

        return { enabled: true };
    }

    run(): CommandOutcome {
        if (this.isZoomedInFully()) return { kind: 'refused', reason: ZOOMED_IN_FULLY };

        this.session.view.zoomIn();

        return { kind: 'done' };
    }

    private isZoomedInFully() {
        return this.session.view.zoom >= MAX_ZOOM;
    }
}
