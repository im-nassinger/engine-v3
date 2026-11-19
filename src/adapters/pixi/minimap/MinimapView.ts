import { levelBoundsOf } from '../../../core/derived/index.ts';
import type { Unsubscribe } from '../../../core/events/index.ts';
import type { Bounds } from '../../../core/geometry/index.ts';
import type { Entity, Level, LevelUpdate } from '../../../core/level/index.ts';
import type { Cancel, Timer } from '../../../editor/time/index.ts';
import type { ViewState } from '../../../editor/view/index.ts';
import type { PixelRatioSource } from '../PixiLevelView.ts';
import { minimapFit, SMALLEST_VIEW_RECTANGLE_PX, viewRectangle } from './minimapFit.ts';
import { paintEntityFill } from './paintEntityFill.ts';
import type { LevelToPicture, MinimapCaches } from './paintEntityFill.ts';

export type { MinimapCaches } from './paintEntityFill.ts';

export type MinimapViewParts = {
    readonly view: ViewState;
    readonly timer: Timer;
    readonly pixelRatio: PixelRatioSource;
};

// The editor's session as the minimap sees it.
export type MinimapLevelSource = {
    readonly openLevel: { readonly level: Level; readonly caches: MinimapCaches };
    readonly openLevelChanged: { subscribe(listener: () => void): Unsubscribe };
};

type Painting = {
    readonly level: Level;
    readonly caches: MinimapCaches;
    readonly entities: readonly Entity[];
    readonly toPicture: LevelToPicture | undefined;
    nextIndex: number;
};

// Four updates a second at most, as the requirement's "a few times a second".
const UPDATE_INTERVAL_MS = 250;
// Dragging at 10,000 entities leaves under 2 ms of a frame free, so painting takes small bites between frames.
const ENTITIES_PER_SLICE = 100;
const SLICE_GAP_MS = 16;

// The design's --accent, and the mockup's fill and line width for the view's rectangle.
const VIEW_RECTANGLE_LINE = '#4f8cff';
const VIEW_RECTANGLE_FILL = 'rgba(79, 140, 255, 0.1)';
const VIEW_RECTANGLE_LINE_WIDTH_PX = 1.5;

function changesDrawOrder(update: LevelUpdate) {
    return update.kind === 'entityAdded' || update.kind === 'entityRemoved' || update.kind === 'entityMoved';
}

// On the CPU, since reading it back after each slice is then cheap: see paintSlice.
function contextOf(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context === null) throw new Error('The minimap needs a 2D canvas.');

    return context;
}

function resetContext(context: CanvasRenderingContext2D) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
}

function clear(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
    resetContext(context);
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function setSize(canvas: HTMLCanvasElement, width: number, height: number) {
    if (canvas.width === width && canvas.height === height) return;

    canvas.width = width;
    canvas.height = height;
}

// Draws the minimap on a plain 2D canvas, away from the level view's frames: see adapters.md.
export class MinimapView {
    readonly canvas = document.createElement('canvas');
    private readonly parts: MinimapViewParts;
    private readonly stopListening: Unsubscribe[] = [];
    // The picture being painted, and the last finished one. The two swap when a painting ends.
    private paintingCanvas = document.createElement('canvas');
    private finishedCanvas = document.createElement('canvas');
    private source: MinimapLevelSource | undefined;
    private stopFollowing: Unsubscribe | undefined;
    private stopListeningToLevel: Unsubscribe[] = [];
    private host: HTMLElement | undefined;
    private resizeObserver: ResizeObserver | undefined;
    private hostWidth = 0;
    private hostHeight = 0;
    private painting: Painting | undefined;
    // Kept until the tree changes: listing 10,000 entities takes 2 ms, and a drag changes no order.
    private drawOrder: readonly Entity[] | undefined;
    private isPictureStale = true;
    private cancelWait: Cancel | undefined;
    private cancelSlice: Cancel | undefined;
    private paintings = 0;

    constructor(parts: MinimapViewParts) {
        this.parts = parts;
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';

        this.stopListening.push(parts.view.version.subscribe(() => this.requestUpdate()));
        this.stopListening.push(parts.pixelRatio.onChange(() => this.applySize()));
    }

    // How many pictures have been finished, for tests.
    get paintingCount() {
        return this.paintings;
    }

    // Shows the open level, and the next one each time it is replaced.
    follow(source: MinimapLevelSource) {
        this.stopFollowing?.();
        this.source = source;
        this.listenToOpenLevel();
        this.stopFollowing = source.openLevelChanged.subscribe(() => this.listenToOpenLevel());
    }

    mount(host: HTMLElement) {
        if (this.host === host) return;

        this.unmount();
        this.host = host;
        host.appendChild(this.canvas);

        this.resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[entries.length - 1];
            if (entry === undefined) return;

            this.hostWidth = entry.contentRect.width;
            this.hostHeight = entry.contentRect.height;
            this.applySize();
        });
        this.resizeObserver.observe(host);
    }

    unmount() {
        this.resizeObserver?.disconnect();
        this.resizeObserver = undefined;
        this.canvas.remove();
        this.host = undefined;
        this.stopWork();
    }

    destroy() {
        this.unmount();
        for (const stop of this.stopListening) {
            stop();
        }
        this.stopFollowing?.();
        this.stopFollowing = undefined;
        this.stopListeningToOpenLevel();
        this.source = undefined;
    }

    private listenToOpenLevel() {
        this.stopListeningToOpenLevel();

        const level = this.source?.openLevel.level;
        if (level === undefined) return;

        const levelUpdated = (update: LevelUpdate) => {
            if (changesDrawOrder(update)) {
                this.drawOrder = undefined;
            }
            this.markPictureStale();
        };
        this.stopListeningToLevel = [
            level.signals.updated.subscribe(levelUpdated),
            level.signals.levelVersion.subscribe(() => this.markPictureStale()),
        ];

        // A painting of the level just replaced is of no use.
        this.drawOrder = undefined;
        this.stopWork();
        this.markPictureStale();
    }

    private stopListeningToOpenLevel() {
        for (const stop of this.stopListeningToLevel) {
            stop();
        }
        this.stopListeningToLevel = [];
    }

    private stopWork() {
        this.cancelWait?.();
        this.cancelWait = undefined;
        this.cancelSlice?.();
        this.cancelSlice = undefined;
        this.painting = undefined;
        this.isPictureStale = true;
    }

    private applySize() {
        const ratio = this.parts.pixelRatio.current();
        const width = Math.max(1, Math.round(this.hostWidth * ratio));
        const height = Math.max(1, Math.round(this.hostHeight * ratio));
        const hasNewSize = this.canvas.width !== width || this.canvas.height !== height;
        if (!hasNewSize && !this.isPictureStale) return;

        this.stopWork();
        setSize(this.canvas, width, height);
        setSize(this.paintingCanvas, width, height);
        setSize(this.finishedCanvas, width, height);
        this.update();
    }

    private markPictureStale() {
        this.isPictureStale = true;
        this.requestUpdate();
    }

    // Every change until the wait ends joins the same update. A painting under way asks again when it ends.
    private requestUpdate() {
        if (this.host === undefined) return;
        if (this.cancelWait !== undefined || this.painting !== undefined) return;

        this.cancelWait = this.parts.timer.after(UPDATE_INTERVAL_MS, () => {
            this.cancelWait = undefined;
            this.update();
        });
    }

    private update() {
        if (this.host === undefined || this.hostWidth === 0) return;

        if (this.isPictureStale) {
            this.startPainting();
            return;
        }

        this.present();
    }

    private startPainting() {
        const open = this.source?.openLevel;
        if (open === undefined) return;

        this.isPictureStale = false;
        clear(this.paintingCanvas, contextOf(this.paintingCanvas));
        this.drawOrder ??= open.level.entitiesInDrawOrder();
        this.painting = {
            level: open.level,
            caches: open.caches,
            entities: this.drawOrder,
            toPicture: this.levelToPicture(open.level),
            nextIndex: 0,
        };
        this.paintSlice();
    }

    private levelToPicture(level: Level): LevelToPicture | undefined {
        const levelBounds = levelBoundsOf(level);
        if (levelBounds === undefined) return undefined;

        const fit = minimapFit(levelBounds, this.canvas);
        const originX = fit.left - levelBounds.left * fit.scale;
        const originY = fit.top - levelBounds.top * fit.scale;

        return { fit, originX, originY };
    }

    private paintSlice() {
        this.cancelSlice = undefined;

        const painting = this.painting;
        if (painting === undefined) return;

        const { level, caches, entities, toPicture } = painting;
        const end = Math.min(painting.nextIndex + ENTITIES_PER_SLICE, entities.length);

        if (toPicture !== undefined) {
            const context = contextOf(this.paintingCanvas);
            for (let index = painting.nextIndex; index < end; index += 1) {
                const entity = entities[index];
                // Removed since the painting began: its caches no longer follow it.
                if (entity === undefined || level.findEntity(entity.id) !== entity) continue;

                paintEntityFill(context, entity, caches, toPicture);
            }
            // The browser saves up fills and plays them back when the picture is first used, 4 to 6 ms at 10,000
            // entities, enough to drop a frame. Reading a pixel makes each slice pay for its own.
            context.getImageData(0, 0, 1, 1);
        }
        painting.nextIndex = end;

        if (end < entities.length) {
            this.cancelSlice = this.parts.timer.after(SLICE_GAP_MS, () => this.paintSlice());
            return;
        }

        this.finishPainting();
    }

    private finishPainting() {
        this.painting = undefined;
        this.paintings += 1;

        const finished = this.paintingCanvas;
        this.paintingCanvas = this.finishedCanvas;
        this.finishedCanvas = finished;

        this.present();
        if (this.isPictureStale) {
            this.requestUpdate();
        }
    }

    // The last finished picture, with the view's rectangle over it.
    private present() {
        const context = contextOf(this.canvas);
        clear(this.canvas, context);
        context.drawImage(this.finishedCanvas, 0, 0);

        const level = this.source?.openLevel.level;
        if (level === undefined) return;

        const levelBounds = levelBoundsOf(level);
        if (levelBounds === undefined) return;

        this.drawViewRectangle(context, levelBounds);
    }

    private drawViewRectangle(context: CanvasRenderingContext2D, levelBounds: Bounds) {
        const ratio = this.parts.pixelRatio.current();
        const fit = minimapFit(levelBounds, this.canvas);
        const visibleBounds = this.parts.view.visibleBounds();
        const smallestSize = SMALLEST_VIEW_RECTANGLE_PX * ratio;
        const rectangle = viewRectangle(fit, levelBounds, visibleBounds, smallestSize);
        if (rectangle === undefined) return;

        // The line stays inside the rectangle, so it isn't cut at the picture's edge.
        const lineWidth = VIEW_RECTANGLE_LINE_WIDTH_PX * ratio;
        const left = rectangle.left + lineWidth / 2;
        const top = rectangle.top + lineWidth / 2;
        const width = rectangle.width - lineWidth;
        const height = rectangle.height - lineWidth;

        context.fillStyle = VIEW_RECTANGLE_FILL;
        context.fillRect(rectangle.left, rectangle.top, rectangle.width, rectangle.height);
        context.strokeStyle = VIEW_RECTANGLE_LINE;
        context.lineWidth = lineWidth;
        context.strokeRect(left, top, width, height);
    }
}
