import { autoDetectRenderer, Container, Matrix } from 'pixi.js';
import type { Renderer } from 'pixi.js';
import type { Level } from '../../core/level/index.ts';
import type { Unsubscribe } from '../../core/events/index.ts';
import type { ViewSettings, ViewState } from '../../editor/view/index.ts';
import type { Cancel, FrameScheduler } from '../../editor/time/index.ts';
import type { EntityDrawingOptions } from './EntityDrawing.ts';
import { LevelDisplay } from './LevelDisplay.ts';
import type { LevelDisplayCaches } from './LevelDisplay.ts';
import {
    BoundsOverlay,
    CameraFrameOverlay,
    DrawingPreviewOverlay,
    GridOverlay,
    JointIconOverlay,
    PhysicsViewOverlay,
    SelectionOverlay,
} from './overlays/index.ts';
import type { DrawingSource, OverlayScene, SelectionSource } from './overlays/index.ts';

// Culling grows the visible area by this many screen pixels, so the editor's 1 px line around an unstyled
// shape, which BoundsCache doesn't count, is never cut at the view's edge.
const CULLING_MARGIN_SCREEN_PX = 2;

// Where the renderer's resolution comes from. DevicePixelRatio in adapters/browser fulfils it.
export type PixelRatioSource = {
    current(): number;
    onChange(listener: (ratio: number) => void): Unsubscribe;
};

export type PixiLevelViewParts = {
    readonly view: ViewState;
    readonly settings: ViewSettings;
    readonly frames: FrameScheduler;
    readonly pixelRatio: PixelRatioSource;
    readonly drawing: EntityDrawingOptions;
};

// The editor's session as the view sees it: the level open now, and a signal when New or Import replaces it.
export type OpenLevelSource = {
    readonly openLevel: { readonly level: Level; readonly caches: LevelDisplayCaches };
    readonly openLevelChanged: { subscribe(listener: () => void): Unsubscribe };
};

// Owns the canvas and decides when to draw. There is no PixiJS Application and so no ticker: a
// change marks the view dirty, which asks for one render on the next animation frame, and an idle
// view asks for nothing.
export class PixiLevelView {
    private readonly parts: PixiLevelViewParts;
    private readonly renderer: Renderer;
    private readonly stage = new Container();
    // Holds the level, moved and zoomed by ViewState's matrix. Its own render group, so an overlay drawn
    // again never makes PixiJS rebuild the level's draw instructions: at 10,000 entities that took 27 ms a frame.
    private readonly levelLayer = new Container({ isRenderGroup: true });
    // In front of the level and unzoomed: overlays draw in screen pixels, so they keep their size at any zoom.
    // The grid is over the level, since the World's fill, drawn first in the level, is the background.
    private readonly gridOverlay = new GridOverlay();
    private readonly boundsOverlay = new BoundsOverlay();
    private readonly cameraFrameOverlay = new CameraFrameOverlay();
    // On top of everything, since it shows what collides whatever the drawing hides.
    private readonly physicsViewOverlay = new PhysicsViewOverlay();
    private readonly jointIconOverlay = new JointIconOverlay();
    // In front of the joint icons, since a selected joint's ring goes around its icon.
    private readonly selectionOverlay = new SelectionOverlay();
    // In front of the selection, since a new shape is drawn over what is selected; the readout stays on top.
    private readonly drawingPreviewOverlay = new DrawingPreviewOverlay();
    private selection: SelectionSource | undefined;
    private stopFollowingSelection: Unsubscribe | undefined;
    private drawing: DrawingSource | undefined;
    private stopFollowingDrawing: Unsubscribe | undefined;
    private readonly stopListening: Unsubscribe[] = [];
    private stopListeningToLevel: Unsubscribe | undefined;
    private stopFollowing: Unsubscribe | undefined;
    private shownLevel: Level | undefined;
    private caches: LevelDisplayCaches | undefined;
    private resizeObserver: ResizeObserver | undefined;
    private host: HTMLElement | undefined;
    private display: LevelDisplay | undefined;
    private cancelFrame: Cancel | undefined;
    private renders = 0;

    private constructor(parts: PixiLevelViewParts, renderer: Renderer) {
        this.parts = parts;
        this.renderer = renderer;
        this.stage.addChild(this.levelLayer);
        this.stage.addChild(
            this.gridOverlay.graphics,
            this.boundsOverlay.graphics,
            this.cameraFrameOverlay.container,
            this.physicsViewOverlay.graphics,
            this.jointIconOverlay.graphics,
            this.drawingPreviewOverlay.graphics,
            this.selectionOverlay.container,
        );
        this.applyViewMatrix();

        this.stopListening.push(parts.view.version.subscribe(() => this.handleViewChange()));
        this.stopListening.push(parts.settings.version.subscribe(() => this.markDirty()));
        this.stopListening.push(parts.pixelRatio.onChange((ratio) => this.setResolution(ratio)));
    }

    // PixiJS starts its renderer asynchronously, so the view is created once, before it is mounted.
    static async create(parts: PixiLevelViewParts) {
        const renderer = await autoDetectRenderer({
            preference: ['webgl', 'canvas'],
            antialias: true,
            autoDensity: true,
            resolution: parts.pixelRatio.current(),
            backgroundAlpha: 0,
            width: 1,
            height: 1,
        });

        return new PixiLevelView(parts, renderer);
    }

    get canvas() {
        return this.renderer.canvas;
    }

    get resolution() {
        return this.renderer.resolution;
    }

    // The level's nodes, undefined until show() is called.
    get levelDisplay() {
        return this.display;
    }

    // What the editor draws over the level, for tests.
    get overlays() {
        return {
            grid: this.gridOverlay,
            bounds: this.boundsOverlay,
            cameraFrame: this.cameraFrameOverlay,
            physicsView: this.physicsViewOverlay,
            jointIcons: this.jointIconOverlay,
            selection: this.selectionOverlay,
            drawingPreview: this.drawingPreviewOverlay,
        };
    }

    // How many times the view has drawn, for tests and the performance numbers.
    get renderCount() {
        return this.renders;
    }

    // Puts the canvas in the host, or moves it there, and follows the host's size from then on.
    mount(host: HTMLElement) {
        if (this.host === host) return;

        this.unmount();
        this.host = host;
        host.appendChild(this.canvas);

        this.resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[entries.length - 1];
            if (entry === undefined) return;

            this.resize(entry.contentRect.width, entry.contentRect.height);
        });
        this.resizeObserver.observe(host);
    }

    unmount() {
        this.resizeObserver?.disconnect();
        this.resizeObserver = undefined;
        this.canvas.remove();
        this.host = undefined;
    }

    // Draws this level from now on: the editor's, a new or imported one, or the PlayMirror during play.
    show(level: Level, caches: LevelDisplayCaches) {
        this.display?.dispose();
        this.stopListeningToLevel?.();

        const display = new LevelDisplay({
            level,
            caches,
            options: this.parts.drawing,
            onChange: () => this.markDirty(),
        });
        this.display = display;
        this.shownLevel = level;
        this.caches = caches;
        this.levelLayer.addChild(display.root);
        // Anything else that shows only in the overlays: the grid size, the camera's size, the World's fill.
        this.stopListeningToLevel = level.signals.levelVersion.subscribe(() => this.markDirty());
        this.markDirty();
    }

    // Shows the open level, and the next one each time it is replaced, so New and Import need nothing more.
    follow(source: OpenLevelSource) {
        this.stopFollowing?.();

        const showOpenLevel = () => {
            const { level, caches } = source.openLevel;
            this.show(level, caches);
        };

        showOpenLevel();
        this.stopFollowing = source.openLevelChanged.subscribe(showOpenLevel);
    }

    // Draws this selection from now on, and again each time it changes. Play shows none.
    showSelection(source: SelectionSource | undefined) {
        this.stopFollowingSelection?.();
        this.selection = source;
        this.stopFollowingSelection = source?.subscribe(() => this.markDirty());
        this.markDirty();
    }

    // Draws the Shape tool's preview from now on, and again each time it changes. Play shows none.
    showDrawing(source: DrawingSource | undefined) {
        this.stopFollowingDrawing?.();
        this.drawing = source;
        this.stopFollowingDrawing = source?.subscribe(() => this.markDirty());
        this.markDirty();
    }

    // Asks for one render on the next frame. Several changes before it still draw once.
    markDirty() {
        if (this.cancelFrame !== undefined) return;

        this.cancelFrame = this.parts.frames.nextFrame(() => {
            this.cancelFrame = undefined;
            this.render();
        });
    }

    destroy() {
        this.unmount();
        this.cancelFrame?.();
        this.cancelFrame = undefined;

        for (const stop of this.stopListening) {
            stop();
        }
        this.stopListeningToLevel?.();
        this.stopListeningToLevel = undefined;
        this.stopFollowing?.();
        this.stopFollowing = undefined;
        this.stopFollowingSelection?.();
        this.stopFollowingSelection = undefined;
        this.selection = undefined;
        this.stopFollowingDrawing?.();
        this.stopFollowingDrawing = undefined;
        this.drawing = undefined;

        this.display?.dispose();
        this.display = undefined;
        this.shownLevel = undefined;
        this.caches = undefined;

        this.stage.destroy({ children: true });
        this.renderer.destroy();
    }

    private resize(width: number, height: number) {
        const safeWidth = Math.max(1, Math.round(width));
        const safeHeight = Math.max(1, Math.round(height));

        this.renderer.resize(safeWidth, safeHeight, this.renderer.resolution);
        // ViewState moves its version on a real change, which marks the view dirty.
        this.parts.view.setSize(width, height);
        this.markDirty();
    }

    private setResolution(ratio: number) {
        if (ratio === this.renderer.resolution) return;

        this.renderer.resize(this.renderer.screen.width, this.renderer.screen.height, ratio);
        this.markDirty();
    }

    private handleViewChange() {
        this.applyViewMatrix();
        this.markDirty();
    }

    private applyViewMatrix() {
        const matrix = this.parts.view.matrix();
        const pixiMatrix = new Matrix(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);

        this.levelLayer.setFromMatrix(pixiMatrix);
    }

    private prepareDisplay() {
        const display = this.display;
        if (display === undefined) return;

        display.prepare();

        const view = this.parts.view;
        const marginInLevel = CULLING_MARGIN_SCREEN_PX / view.zoom;
        const visibleBounds = view.visibleBounds();
        const cullingArea = visibleBounds.expandedBy(marginInLevel);
        display.cull(cullingArea);
    }

    private updateOverlays() {
        const scene: OverlayScene = {
            view: this.parts.view,
            settings: this.parts.settings,
            level: this.shownLevel,
            caches: this.caches,
        };

        this.gridOverlay.update(scene);
        this.boundsOverlay.update(scene);
        this.cameraFrameOverlay.update(scene);
        this.physicsViewOverlay.update(scene);
        this.jointIconOverlay.update(scene);
        this.drawingPreviewOverlay.update(scene, this.drawing);
        this.selectionOverlay.update(scene, this.selection);
    }

    private render() {
        this.renders += 1;
        this.prepareDisplay();
        this.updateOverlays();
        this.renderer.render({ container: this.stage });
    }
}
