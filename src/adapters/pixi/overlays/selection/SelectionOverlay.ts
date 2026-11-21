import { Container, Graphics, Text } from 'pixi.js';
import type { FillStyle, StrokeStyle } from 'pixi.js';
import { ShapeComponent } from '../../../../core/components/index.ts';
import { Bounds } from '../../../../core/geometry/index.ts';
import type { Point } from '../../../../core/geometry/index.ts';
import type { Entity } from '../../../../core/level/index.ts';
import { HANDLE_SIZE_PX } from '../../../../editor/tools/index.ts';
import { JOINT_ICON_RADIUS_PX } from '../../../../editor/view/index.ts';
import type { OverlayCaches, OverlayScene } from '../OverlayScene.ts';
import { dashedLine } from '../dashes.ts';
import {
    ACCENT,
    HANDLE_DOT_PX,
    OVERLAY_FONT,
    OVERLAY_TEXT_PX,
    ROUND_POINT_PX,
    drawCurveHandles,
    drawHandle,
    drawRoundPoint,
} from '../overlayLook.ts';
import { screenRectangleOf, squareAround } from '../screenPixels.ts';

import { planSelection } from './selectionPlan.ts';
import type { SelectionPlan } from './selectionPlan.ts';
import { shapeOutline } from './shapeOutline.ts';
import type { SelectionSource, ShownFrame, ShownPoints, ShownReadout } from './SelectionSource.ts';

const HEAVY_OUTLINE: StrokeStyle = { color: ACCENT, width: 1.5, join: 'round', cap: 'round' };
const THIN_OUTLINE: StrokeStyle = { color: ACCENT, width: 1, join: 'round', cap: 'round' };
// The rest of a selected entity's body (proposal): the thin outline, fainter.
const BODY_OUTLINE: StrokeStyle = { color: ACCENT, alpha: 0.5, width: 1, join: 'round', cap: 'round' };
const BOX: StrokeStyle = { color: ACCENT, width: 1, join: 'miter' };
const RING: StrokeStyle = { color: ACCENT, width: 2 };
const CAMERA_FRAME: StrokeStyle = { color: ACCENT, width: 3, join: 'miter' };
const SELECTION_BOX_FILL: FillStyle = { color: ACCENT, alpha: 0.08 };
// The ring sits just outside the joint icon's edge.
const RING_RADIUS_PX = JOINT_ICON_RADIUS_PX + 3;
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
const RADIUS_PX = 8;

// What was drawn last, in screen pixels, for tests.
export type DrawnSelection = {
    readonly outlines: number;
    readonly bodyOutlines: number;
    readonly rings: number;
    readonly cameraFrames: number;
    readonly padlocks: number;
    readonly handles: readonly Bounds[];
    // The edited polygon's, line's or path's points, how many draw as circles (smooth or separate), and how
    // many as selected.
    readonly points: readonly Bounds[];
    readonly roundPoints: number;
    readonly selectedPoints: number;
    // The selected points' curve handles' end dots.
    readonly handleDots: readonly Bounds[];
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
    points: [],
    roundPoints: 0,
    selectedPoints: 0,
    handleDots: [],
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
        style: { fontFamily: OVERLAY_FONT, fontSize: OVERLAY_TEXT_PX, fill: ACCENT },
    });
    private readonly readoutBox = new Container();
    private readonly readoutBackground = new Graphics();
    private readonly readoutLabel = new Text({
        text: '',
        style: { fontFamily: OVERLAY_FONT, fontSize: OVERLAY_TEXT_PX, fill: TOOLTIP_TEXT },
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
        const handleDots = source.editedPoints === undefined ? [] : this.drawCurveHandles(source.editedPoints, scene);
        const points = source.editedPoints === undefined ? [] : this.drawPoints(source.editedPoints, scene);

        this.shown = {
            outlines: this.drawOutlines(plan.outlines, plan.heavyOutline ? HEAVY_OUTLINE : THIN_OUTLINE, scene, caches),
            bodyOutlines: this.drawOutlines(plan.bodyOutlines, BODY_OUTLINE, scene, caches),
            rings: this.drawRings(plan.rings, scene),
            cameraFrames: this.drawCameraFrames(plan, scene),
            padlocks: this.drawPadlocks(plan, scene),
            handles,
            points,
            roundPoints: source.editedPoints?.corners.filter((corner) => corner !== 'sharp').length ?? 0,
            selectedPoints: source.editedPoints?.selected.length ?? 0,
            handleDots,
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

        const squares = frame.handles.map((handle) => squareAround(scene.view.levelToScreen(handle), HANDLE_SIZE_PX));

        for (const square of squares) {
            drawHandle(this.handleSquares, square);
        }

        return squares;
    }

    // Under the points, so a handle pulled back onto its point never hides it.
    private drawCurveHandles(edited: ShownPoints, scene: OverlayScene) {
        const ends = edited.handles.map(
            ([from, to]) => [scene.view.levelToScreen(from), scene.view.levelToScreen(to)] as const,
        );
        drawCurveHandles(this.handleSquares, ends);

        return ends.map(([, end]) => squareAround(end, HANDLE_DOT_PX));
    }

    // Each point the same size at any zoom: a sharp one an 8 px square, a smooth or separate one a 9 px circle,
    // the selected ones filled with the accent colour and the others hollow.
    private drawPoints(edited: ShownPoints, scene: OverlayScene) {
        const selected = new Set(edited.selected);

        return edited.points.map((point, index) => {
            const centre = scene.view.levelToScreen(point);
            const inside = selected.has(index) ? ACCENT : undefined;
            const isRound = edited.corners[index] !== undefined && edited.corners[index] !== 'sharp';
            if (!isRound) {
                const square = squareAround(centre, HANDLE_SIZE_PX);
                drawHandle(this.handleSquares, square, inside);
                return square;
            }

            drawRoundPoint(this.handleSquares, centre, inside);
            return squareAround(centre, ROUND_POINT_PX);
        });
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
            dashedLine(this.lines, from, to);
            from = to;
        }
        this.lines.stroke(BOX);

        return onScreen;
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
