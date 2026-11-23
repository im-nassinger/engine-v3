import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';
import { fitView } from './fitView.ts';

const NO_CAMERA_FRAME = 'The camera has no frame';

// Shift+3: fits the camera's frame into the view, hidden or not. Never a step.
export class FitCameraFrameCommand implements EditorCommand {
    readonly id = 'view.fitCameraFrame';
    readonly label = 'Camera frame';
    readonly menu = { menu: 'View', section: 3, order: 30 } as const;
    readonly shortcuts = ['Shift+3'];
    readonly shortcutName = 'Zoom to the camera frame';
    private readonly session: EditorSession;

    constructor(session: EditorSession) {
        this.session = session;
    }

    availability(): Availability {
        const frame = this.cameraFrame();
        if (frame === undefined) return { enabled: false, reason: NO_CAMERA_FRAME };

        return { enabled: true };
    }

    run(): CommandOutcome {
        const frame = this.cameraFrame();
        if (frame === undefined) return { kind: 'refused', reason: NO_CAMERA_FRAME };

        fitView(this.session.view, frame);

        return { kind: 'done' };
    }

    private cameraFrame() {
        const { level, caches } = this.session.openLevel;

        return caches.bounds.ownBoundsOf(level.camera);
    }
}
