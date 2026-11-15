import { autoDetectRenderer, Container, Matrix } from 'pixi.js';
import type { Renderer } from 'pixi.js';
import type { Unsubscribe } from '../../core/events/index.ts';
import type { ViewState } from '../../editor/view/index.ts';
import type { Cancel, FrameScheduler } from '../../editor/time/index.ts';

// Where the renderer's resolution comes from. DevicePixelRatio in adapters/browser fulfils it.
export type PixelRatioSource = {
    current(): number;
    onChange(listener: (ratio: number) => void): Unsubscribe;
};

export type PixiLevelViewParts = {
    readonly view: ViewState;
    readonly frames: FrameScheduler;
    readonly pixelRatio: PixelRatioSource;
};

// Owns the canvas and decides when to draw. There is no PixiJS Application and so no ticker: a
// change marks the view dirty, which asks for one render on the next animation frame, and an idle
// view asks for nothing.
export class PixiLevelView {
    private readonly parts: PixiLevelViewParts;
    private readonly renderer: Renderer;
    private readonly stage = new Container();
    // Holds the level, moved and zoomed by ViewState's matrix. Overlays will sit beside it, unzoomed.
    private readonly levelLayer = new Container();
    private readonly stopListening: Unsubscribe[] = [];
    private resizeObserver: ResizeObserver | undefined;
    private host: HTMLElement | undefined;
    private cancelFrame: Cancel | undefined;
    private renders = 0;

    private constructor(parts: PixiLevelViewParts, renderer: Renderer) {
        this.parts = parts;
        this.renderer = renderer;
        this.stage.addChild(this.levelLayer);
        this.applyViewMatrix();

        this.stopListening.push(parts.view.version.subscribe(() => this.handleViewChange()));
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

    private render() {
        this.renders += 1;
        this.renderer.render({ container: this.stage });
    }
}
