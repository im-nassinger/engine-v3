import type { PixiLevelView } from '../adapters/pixi/index.ts';
import type { Unsubscribe } from '../core/events/index.ts';
import type { PlayMirror, PlaySession } from '../editor/play/index.ts';
import type { EditorSession } from '../editor/session/index.ts';

// Test play in the level view: from the moment the game has started, the PlayMirror through the camera,
// placed again each frame the session draws it between ticks; on Stop the editor's open level in the
// editor's own view, which play never moved.
export class PlayViewLink {
    private readonly play: PlaySession;
    private readonly levelView: PixiLevelView;
    private readonly session: EditorSession;
    private shownMirror: PlayMirror | undefined;

    constructor(play: PlaySession, levelView: PixiLevelView, session: EditorSession) {
        this.play = play;
        this.levelView = levelView;
        this.session = session;
    }

    connect(): Unsubscribe {
        const stopFollowingRun = this.play.version.subscribe(() => this.followRun());
        const stopFollowingFrames = this.play.drawn.subscribe(() => this.placeCamera());

        return () => {
            stopFollowingRun();
            stopFollowingFrames();
        };
    }

    private followRun() {
        const mirror = this.play.mirror;
        if (mirror === this.shownMirror) return;

        this.shownMirror = mirror;
        if (mirror === undefined) {
            this.levelView.stopShowingThroughCamera();
            const { level, caches } = this.session.openLevel;
            this.levelView.show(level, caches);
            return;
        }

        this.levelView.show(mirror.level, mirror.caches, mirror);
        this.placeCamera();
    }

    // The bodies' nodes follow the mirror's caches by themselves; the camera is placed here.
    private placeCamera() {
        const mirror = this.shownMirror;
        if (mirror === undefined) return;

        this.levelView.showThroughCamera(mirror.camera, mirror.cameraBox);
    }
}
