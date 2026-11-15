import { VersionCounter } from '../../core/events/index.ts';
import { Bounds, Matrix2D } from '../../core/geometry/index.ts';
import type { Point } from '../../core/geometry/index.ts';

export const MIN_ZOOM = 0.01;
export const MAX_ZOOM = 10;
export const FIT_MARGIN_PX = 40;
export const ZOOM_STEP = 2;

export type ViewSize = { readonly width: number; readonly height: number };

// How far the panels reach over each edge of the level view, in CSS pixels.
export type CoveredEdges = {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
};

const NOTHING_COVERED: CoveredEdges = { left: 0, top: 0, right: 0, bottom: 0 };

function clampZoom(zoom: number) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function clamp(value: number, low: number, high: number) {
    return Math.min(high, Math.max(low, value));
}

// The level view's pan and zoom. It keeps the level position at the middle of the view, so resizing
// the window keeps the level where it was. Zoom 1 is 100%: one level pixel per CSS pixel. Screen
// positions are CSS pixels from the view's top left corner. Never an undo step.
export class ViewState {
    readonly version = new VersionCounter();
    private middleX = 0;
    private middleY = 0;
    private currentZoom = 1;
    private viewWidth = 0;
    private viewHeight = 0;
    private panArea: Bounds | undefined;
    private covered = NOTHING_COVERED;

    get middle(): Point {
        return { x: this.middleX, y: this.middleY };
    }

    get zoom() {
        return this.currentZoom;
    }

    get size(): ViewSize {
        return { width: this.viewWidth, height: this.viewHeight };
    }

    setSize(width: number, height: number) {
        const safeWidth = Math.max(0, width);
        const safeHeight = Math.max(0, height);
        if (safeWidth === this.viewWidth && safeHeight === this.viewHeight) return;

        this.viewWidth = safeWidth;
        this.viewHeight = safeHeight;
        this.version.increment();
    }

    get coveredEdges() {
        return this.covered;
    }

    // The panels sit over the level view, so fitting fills only the part they leave free. Nothing on
    // screen moves, so the version stays.
    setCoveredEdges(edges: CoveredEdges) {
        this.covered = {
            left: Math.max(0, edges.left),
            top: Math.max(0, edges.top),
            right: Math.max(0, edges.right),
            bottom: Math.max(0, edges.bottom),
        };
    }

    // The World's rectangle. The view's middle stays inside it grown on every side by its larger
    // side, so panning stops "well outside the level" by a distance that scales with the level.
    setPanLimit(worldRectangle: Bounds | undefined) {
        if (worldRectangle === undefined) {
            this.panArea = undefined;
            return;
        }

        const largerSide = Math.max(worldRectangle.width, worldRectangle.height);
        this.panArea = worldRectangle.expandedBy(largerSide);
        this.moveMiddleTo(this.middleX, this.middleY);
    }

    levelToScreen(levelPoint: Point): Point {
        const x = (levelPoint.x - this.middleX) * this.currentZoom + this.viewWidth / 2;
        const y = (levelPoint.y - this.middleY) * this.currentZoom + this.viewHeight / 2;

        return { x, y };
    }

    screenToLevel(screenPoint: Point): Point {
        const x = (screenPoint.x - this.viewWidth / 2) / this.currentZoom + this.middleX;
        const y = (screenPoint.y - this.viewHeight / 2) / this.currentZoom + this.middleY;

        return { x, y };
    }

    // Level positions to screen positions, for the renderer.
    matrix() {
        const zoom = this.currentZoom;
        const offsetX = this.viewWidth / 2 - this.middleX * zoom;
        const offsetY = this.viewHeight / 2 - this.middleY * zoom;

        return new Matrix2D(zoom, 0, 0, zoom, offsetX, offsetY);
    }

    // The level rectangle the view shows now.
    visibleBounds() {
        const topLeft = this.screenToLevel({ x: 0, y: 0 });
        const bottomRight = this.screenToLevel({ x: this.viewWidth, y: this.viewHeight });

        return new Bounds(topLeft.x, topLeft.y, bottomRight.x, bottomRight.y);
    }

    // True when the view doesn't overlap what the level holds, so a `Back to level` button is due.
    holdsNothing(levelContents: Bounds | undefined) {
        if (levelContents === undefined) return true;

        const visible = this.visibleBounds();
        return !visible.overlaps(levelContents);
    }

    // Moves the view by a distance in screen pixels: dragging right by 10 px moves the level right.
    panBy(screenDeltaX: number, screenDeltaY: number) {
        const middleX = this.middleX - screenDeltaX / this.currentZoom;
        const middleY = this.middleY - screenDeltaY / this.currentZoom;

        this.moveMiddleTo(middleX, middleY);
    }

    centreOn(levelPoint: Point) {
        this.moveMiddleTo(levelPoint.x, levelPoint.y);
    }

    // Zooms keeping the level point under the screen point still, unless the pan limit stops it.
    zoomAt(screenPoint: Point, zoom: number) {
        const newZoom = clampZoom(zoom);
        const levelPoint = this.screenToLevel(screenPoint);

        const middleX = levelPoint.x - (screenPoint.x - this.viewWidth / 2) / newZoom;
        const middleY = levelPoint.y - (screenPoint.y - this.viewHeight / 2) / newZoom;

        this.change(middleX, middleY, newZoom);
    }

    zoomAboutMiddle(zoom: number) {
        const newZoom = clampZoom(zoom);
        this.change(this.middleX, this.middleY, newZoom);
    }

    zoomIn() {
        const zoom = this.currentZoom * ZOOM_STEP;
        this.zoomAboutMiddle(zoom);
    }

    zoomOut() {
        const zoom = this.currentZoom / ZOOM_STEP;
        this.zoomAboutMiddle(zoom);
    }

    // Fills the part of the view the panels leave free with the rectangle, less FIT_MARGIN_PX on each
    // side, and centres it there. Nothing to fit leaves the view alone. A rectangle with no width or
    // height fits along its other side, and a single point zooms in fully.
    fit(levelRectangle: Bounds | undefined) {
        if (levelRectangle === undefined) return;

        const freeWidth = this.viewWidth - this.covered.left - this.covered.right;
        const freeHeight = this.viewHeight - this.covered.top - this.covered.bottom;
        const availableWidth = Math.max(1, freeWidth - 2 * FIT_MARGIN_PX);
        const availableHeight = Math.max(1, freeHeight - 2 * FIT_MARGIN_PX);

        let zoom = MAX_ZOOM;
        if (levelRectangle.width > 0) {
            zoom = Math.min(zoom, availableWidth / levelRectangle.width);
        }
        if (levelRectangle.height > 0) {
            zoom = Math.min(zoom, availableHeight / levelRectangle.height);
        }

        const newZoom = clampZoom(zoom);
        const centre = levelRectangle.centre;
        // How far the free part's middle is from the view's middle, in screen pixels.
        const freeOffsetX = (this.covered.left - this.covered.right) / 2;
        const freeOffsetY = (this.covered.top - this.covered.bottom) / 2;
        const middleX = centre.x - freeOffsetX / newZoom;
        const middleY = centre.y - freeOffsetY / newZoom;

        this.change(middleX, middleY, newZoom);
    }

    private moveMiddleTo(middleX: number, middleY: number) {
        this.change(middleX, middleY, this.currentZoom);
    }

    private change(middleX: number, middleY: number, zoom: number) {
        let limitedX = middleX;
        let limitedY = middleY;

        if (this.panArea !== undefined) {
            limitedX = clamp(middleX, this.panArea.left, this.panArea.right);
            limitedY = clamp(middleY, this.panArea.top, this.panArea.bottom);
        }

        const unchanged = limitedX === this.middleX && limitedY === this.middleY && zoom === this.currentZoom;
        if (unchanged) return;

        this.middleX = limitedX;
        this.middleY = limitedY;
        this.currentZoom = zoom;
        this.version.increment();
    }
}
