import { Container, Graphics, Text } from 'pixi.js';
import type { FillStyle, StrokeStyle } from 'pixi.js';
import { ShapeComponent } from '../../../../core/components/index.ts';
import { Bounds } from '../../../../core/geometry/index.ts';
import type { Point } from '../../../../core/geometry/index.ts';
import type { Entity } from '../../../../core/level/index.ts';
import { HANDLE_SIZE_PX } from '../../../../editor/tools/index.ts';
import { JOINT_ICON_RADIUS_PX } from '../../../../editor/view/index.ts';
import type { OverlayCaches, OverlayScene } from '../OverlayScene.ts';
import { screenRectangleOf } from '../screenPixels.ts';

import { planSelection } from './selectionPlan.ts';
import type { SelectionPlan } from './selectionPlan.ts';
import { shapeOutline } from './shapeOutline.ts';
import type { SelectionSource, ShownFrame, ShownReadout } from './SelectionSource.ts';

// The design's --accent, which draws every selection.
const ACCENT = 0x3b82f6;
const HEAVY_OUTLINE: StrokeStyle = { color: ACCENT, width: 1.5, join: 'round', cap: 'round' };
const THIN_OUTLINE: StrokeStyle = { color: ACCENT, width: 1, join: 'round', cap: 'round' };
// The rest of a selected entity's body (proposal): the thin outline, fainter.
const BODY_OUTLINE: StrokeStyle = { color: ACCENT, alpha: 0.5, width: 1, join: 'round', cap: 'round' };
const BOX: StrokeStyle = { color: ACCENT, width: 1, join: 'miter' };
const RING: StrokeStyle = { color: ACCENT, width: 2 };
const CAMERA_FRAME: StrokeStyle = { color: ACCENT, width: 3, join: 'miter' };
const HANDLE_EDGE: StrokeStyle = { color: ACCENT, width: 1.5, join: 'miter' };
const SELECTION_BOX_FILL: FillStyle = { color: ACCENT, alpha: 0.08 };
// The ring sits just outside the joint icon's edge.
const RING_RADIUS_PX = JOINT_ICON_RADIUS_PX + 3;
const DASH_PX = 4;
const DASH_GAP_PX = 3;
// A hidden joint has no size, so its dashed box is at least this big.
const MIN_HIDDEN_BOX_PX = 2 * RING_RADIUS_PX;
const PADLOCK_WIDTH_PX = 8;
const PADLOCK_GAP_PX = 3;
const LABEL_GAP_PX = 4;
// The design: the readout 16 screen px below and right of the mouse, a --tooltip box with --tooltip-text.
const READOUT_OFFSET_PX = 16;
const READOUT_PADDING_X_PX = 6;
const READOUT_PADDING_Y_PX = 3;
const TOOLTIP = 0x0b0d10;
const TOOLTIP_TEXT = 0xe8ebf0;
const RADIUS_PX = 4;
const FONT = 'JetBrains Mono, monospace';
const TEXT_SMALL_PX = 11;

// What was drawn last, in screen pixels, for tests.
export type DrawnSelection = {
    readonly outlines: number;
    readonly bodyOutlines: number;
    readonly rings: number;
    readonly cameraFrames: number;
    readonly padlocks: number;
    readonly handles: readonly Bounds[];
    readonly sharedBox: Bounds | undefined;
    readonly hiddenBox: Bounds | undefined;
    readonly selectionBox: Bounds | undefined;
    readonly count: string | undefined;
    readonly readout: string | undefined;
};

const NOTHING_DRAWN: DrawnSelection = {
    outlines: 0,
    bodyOutlines: 0,
    rings: 0,
    cameraFrames: 0,
    padlocks: 0,
    handles: [],
    sharedBox: undefined,
    hiddenBox: undefined,
    selectionBox: undefined,
    count: undefined,
    readout: undefined,
};

// The selection as the requirement's table draws it, in front of the level and in screen pixels, so
// outlines and handles keep their size at any zoom; the selection box being dragged; the drag's readout.
export class SelectionOverlay {
    readonly container = new Container();
    private readonly lines = new Graphics();
    private readonly handleSquares = new Graphics();
    private readonly countLabel = new Text({
        text: '',
        style: { fontFamily: FONT, fontSize: TEXT_SMALL_PX, fill: ACCENT },
    });
    private readonly readoutBox = new Container();
    private readonly readoutBackground = new Graphics();
    private readonly readoutLabel = new Text({
        text: '',
        style: { fontFamily: FONT, fontSize: TEXT_SMALL_PX, fill: TOOLTIP_TEXT },
    });
    private shown: DrawnSelection = NOTHING_DRAWN;

    constructor() {
        this.countLabel.anchor.set(0, 1);
        this.readoutLabel.position.set(READOUT_PADDING_X_PX, READOUT_PADDING_Y_PX);
        this.readoutBox.addChild(this.readoutBackground, this.readoutLabel);
        this.container.addChild(this.lines, this.handleSquares, this.countLabel, this.readoutBox);
    }

    get drawn() {
        return this.shown;
    }

    update(scene: OverlayScene, source: SelectionSource | undefined) {
        this.lines.clear();
        this.handleSquares.clear();
        this.countLabel.visible = false;
        this.readoutBox.visible = false;
        this.shown = NOTHING_DRAWN;

        const { level, caches } = scene;
        if (source === undefined || level === undefined || caches === undefined) return;

        const plan = planSelection(source, level, caches);
        const handles = source.frame === undefined ? [] : this.drawFrame(source.frame, scene);

        this.shown = {
            outlines: this.drawOutlines(plan.outlines, plan.heavyOutline ? HEAVY_OUTLINE : THIN_OUTLINE, scene, caches),
            bodyOutlines: this.drawOutlines(plan.bodyOutlines, BODY_OUTLINE, scene, caches),
            rings: this.drawRings(plan.rings, scene),
            cameraFrames: this.drawCameraFrames(plan, scene),
            padlocks: this.drawPadlocks(plan, scene),
            handles,
            sharedBox: this.drawSharedBox(plan, scene),
            hiddenBox: this.drawHiddenBox(plan, scene),
            selectionBox: this.drawSelectionBox(source.selectionBox, scene),
            count: this.drawCount(plan, scene),
            readout: this.drawReadout(source.readout, scene),
        };
    }

    destroy() {
        this.container.destroy({ children: true });
    }

    private drawOutlines(entities: readonly Entity[], style: StrokeStyle, scene: OverlayScene, caches: OverlayCaches) {
        const visible = scene.view.visibleBounds();
        let drawn = 0;

        for (const entity of entities) {
            const bounds = caches.bounds.ownBoundsOf(entity);
            if (bounds !== undefined && !bounds.overlaps(visible)) continue;

            const geometry = entity.requireComponent(ShapeComponent).get('geometry');
            const outline = shapeOutline(geometry, caches.worldMatrices.matrixOf(entity));
            const onScreen = outline.points.map((point) => scene.view.levelToScreen(point));
            this.strokePath(onScreen, outline.isClosed, style);
            drawn += 1;
        }

        return drawn;
    }

    private strokePath(points: readonly Point[], isClosed: boolean, style: StrokeStyle) {
        const [first, ...rest] = points;
        if (first === undefined) return;

        this.lines.moveTo(first.x, first.y);
        for (const point of rest) {
            this.lines.lineTo(point.x, point.y);
        }
        if (isClosed) {
            this.lines.closePath();
        }
        this.lines.stroke(style);
    }

    // The box along the entity's own sides, and its eight handles, each the same size on screen.
    private drawFrame(frame: ShownFrame, scene: OverlayScene) {
        const corners = frame.corners.map((corner) => scene.view.levelToScreen(corner));
        this.strokePath(corners, true, BOX);

        const half = HANDLE_SIZE_PX / 2;
        const squares = frame.handles.map((handle) => {
            const centre = scene.view.levelToScreen(handle);
            return new Bounds(centre.x - half, centre.y - half, centre.x + half, centre.y + half);
        });

        for (const square of squares) {
            this.handleSquares
                .rect(square.left, square.top, square.width, square.height)
                .fill(0xffffff)
                .stroke(HANDLE_EDGE);
        }

        return squares;
    }

    private drawRings(rings: readonly Point[], scene: OverlayScene) {
        for (const ring of rings) {
            const centre = scene.view.levelToScreen(ring);
            this.lines.circle(centre.x, centre.y, RING_RADIUS_PX).stroke(RING);
        }

        return rings.length;
    }

    private drawCameraFrames(plan: SelectionPlan, scene: OverlayScene) {
        for (const frame of plan.cameraFrames) {
            const onScreen = screenRectangleOf(frame, scene.view);
            this.lines.rect(onScreen.left, onScreen.top, onScreen.width, onScreen.height).stroke(CAMERA_FRAME);
        }

        return plan.cameraFrames.length;
    }

    // A small padlock just outside the top right corner of what the locked entity draws.
    private drawPadlocks(plan: SelectionPlan, scene: OverlayScene) {
        for (const drawn of plan.padlocks) {
            const onScreen = screenRectangleOf(drawn, scene.view);
            const left = onScreen.right + PADLOCK_GAP_PX;
            const top = onScreen.top - PADLOCK_GAP_PX - PADLOCK_WIDTH_PX;
            const half = PADLOCK_WIDTH_PX / 2;

            this.lines.arc(left + half, top + half, half - 1.5, Math.PI, 0).stroke({ color: ACCENT, width: 1.5 });
            this.lines.rect(left, top + half, PADLOCK_WIDTH_PX, half + 2).fill(ACCENT);
        }

        return plan.padlocks.length;
    }

    private drawSharedBox(plan: SelectionPlan, scene: OverlayScene) {
        if (plan.sharedBox === undefined) return undefined;

        const onScreen = screenRectangleOf(plan.sharedBox, scene.view);
        this.lines.rect(onScreen.left, onScreen.top, onScreen.width, onScreen.height).stroke(BOX);

        return onScreen;
    }

    private drawHiddenBox(plan: SelectionPlan, scene: OverlayScene) {
        if (plan.hiddenBox === undefined) return undefined;

        const onScreen = atLeast(screenRectangleOf(plan.hiddenBox, scene.view), MIN_HIDDEN_BOX_PX);
        const [first, ...rest] = onScreen.corners();
        if (first === undefined) return onScreen;

        let from = first;
        for (const to of [...rest, first]) {
            this.dashedLine(from, to);
            from = to;
        }
        this.lines.stroke(BOX);

        return onScreen;
    }

    private dashedLine(from: Point, to: Point) {
        const length = Math.hypot(to.x - from.x, to.y - from.y);
        if (length === 0) return;

        const along = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
        for (let start = 0; start < length; start += DASH_PX + DASH_GAP_PX) {
            const end = Math.min(start + DASH_PX, length);
            this.lines.moveTo(from.x + along.x * start, from.y + along.y * start);
            this.lines.lineTo(from.x + along.x * end, from.y + along.y * end);
        }
    }

    private drawSelectionBox(box: Bounds | undefined, scene: OverlayScene) {
        if (box === undefined) return undefined;

        const onScreen = screenRectangleOf(box, scene.view);
        this.lines
            .rect(onScreen.left, onScreen.top, onScreen.width, onScreen.height)
            .fill(SELECTION_BOX_FILL)
            .stroke(BOX);

        return onScreen;
    }

    private drawCount(plan: SelectionPlan, scene: OverlayScene) {
        if (plan.count === undefined || plan.sharedBox === undefined) return undefined;

        const text = `${plan.count} selected`;
        const onScreen = screenRectangleOf(plan.sharedBox, scene.view);
        this.setText(this.countLabel, text);
        this.countLabel.position.set(Math.round(onScreen.left), Math.round(onScreen.top - LABEL_GAP_PX));
        this.countLabel.visible = true;

        return text;
    }

    private drawReadout(readout: ShownReadout | undefined, scene: OverlayScene) {
        if (readout === undefined) return undefined;

        this.setText(this.readoutLabel, readout.text);
        const width = this.readoutLabel.width + 2 * READOUT_PADDING_X_PX;
        const height = this.readoutLabel.height + 2 * READOUT_PADDING_Y_PX;
        this.readoutBackground.clear().roundRect(0, 0, width, height, RADIUS_PX).fill(TOOLTIP);

        const mouse = scene.view.levelToScreen(readout.at);
        this.readoutBox.position.set(Math.round(mouse.x + READOUT_OFFSET_PX), Math.round(mouse.y + READOUT_OFFSET_PX));
        this.readoutBox.visible = true;

        return readout.text;
    }

    private setText(label: Text, text: string) {
        if (label.text !== text) {
            label.text = text;
        }
    }
}

// Grows the rectangle around its centre to at least size on each side.
function atLeast(rectangle: Bounds, size: number) {
    const centre = rectangle.centre;
    const halfWidth = Math.max(rectangle.width, size) / 2;
    const halfHeight = Math.max(rectangle.height, size) / 2;

    return new Bounds(centre.x - halfWidth, centre.y - halfHeight, centre.x + halfWidth, centre.y + halfHeight);
}
