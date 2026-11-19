import { Container, Graphics, Text } from 'pixi.js';
import type { StrokeStyle } from 'pixi.js';
import type { Bounds, Point } from '../../../../core/geometry/index.ts';
import { dashedLine } from '../dashes.ts';
import { ACCENT, OVERLAY_FONT, OVERLAY_TEXT_PX } from '../overlayLook.ts';
import type { OverlayScene } from '../OverlayScene.ts';
import { screenRectangleOf } from '../screenPixels.ts';

import { planJointPreview } from './planJointPreview.ts';
import type { JointPreviewPlan } from './planJointPreview.ts';
import type { JointPreviewSource } from './JointPreviewSource.ts';

// The accent draws the preview, and the joint icon's edge colour the thin lines (proposal).
const ICON_EDGE = 0x1d2430;
const PATH: StrokeStyle = { color: ACCENT, width: 1.5, join: 'round', cap: 'round' };
const OUTLINE: StrokeStyle = { color: ACCENT, width: 1, join: 'miter' };
const LINK: StrokeStyle = { color: ICON_EDGE, alpha: 0.6, width: 1, cap: 'butt' };
const END_EDGE: StrokeStyle = { color: 0xffffff, width: 1.5 };
const END_RADIUS_PX = 3.5;
// The label sits below and to the right of the mouse, clear of the cursor.
const LABEL_OFFSET_PX = 12;

// What was drawn last, in screen pixels, for tests.
export type DrawnJointPreview = {
    readonly pathPoints: number;
    readonly ends: readonly Point[];
    readonly outlines: readonly Bounds[];
    readonly label: string | undefined;
    readonly links: readonly (readonly [Point, Point])[];
};

const NOTHING_DRAWN: DrawnJointPreview = { pathPoints: 0, ends: [], outlines: [], label: undefined, links: [] };

// The Joint tool's preview: the entities a click would join outlined, a Rope's line or a Spring's zigzag
// from the first end to the mouse, a dot at each end, and the label such as "Hinge: Wheel to Car". Also the
// thin dashed lines from a selected or hovered joint to its two entities. Drawn in screen pixels, so it
// keeps its size at any zoom.
export class JointPreviewOverlay {
    readonly container = new Container();
    private readonly graphics = new Graphics();
    private readonly label = new Text({
        text: '',
        style: { fontFamily: OVERLAY_FONT, fontSize: OVERLAY_TEXT_PX, fill: ACCENT },
    });
    private shown: DrawnJointPreview = NOTHING_DRAWN;

    constructor() {
        this.label.visible = false;
        this.container.addChild(this.graphics, this.label);
    }

    get drawn() {
        return this.shown;
    }

    update(scene: OverlayScene, source: JointPreviewSource | undefined) {
        this.graphics.clear();
        this.label.visible = false;
        this.shown = NOTHING_DRAWN;

        const { level, caches } = scene;
        if (source === undefined || level === undefined || caches === undefined) return;

        const plan = planJointPreview(source, level, caches);
        const toScreen = (point: Point) => scene.view.levelToScreen(point);

        this.shown = {
            links: this.drawLinks(plan, toScreen),
            outlines: this.drawOutlines(plan, scene),
            pathPoints: this.drawPath(plan, toScreen),
            ends: this.drawEnds(plan, toScreen),
            label: this.drawLabel(plan, toScreen),
        };
    }

    destroy() {
        this.container.destroy({ children: true });
    }

    private drawLinks(plan: JointPreviewPlan, toScreen: (point: Point) => Point) {
        const onScreen = plan.links.map(([from, to]) => [toScreen(from), toScreen(to)] as const);
        if (onScreen.length === 0) return onScreen;

        for (const [from, to] of onScreen) {
            dashedLine(this.graphics, from, to);
        }
        this.graphics.stroke(LINK);

        return onScreen;
    }

    private drawOutlines(plan: JointPreviewPlan, scene: OverlayScene) {
        const rectangles = plan.outlined.map((bounds) => screenRectangleOf(bounds, scene.view));

        for (const rectangle of rectangles) {
            this.graphics.rect(rectangle.left, rectangle.top, rectangle.width, rectangle.height).stroke(OUTLINE);
        }

        return rectangles;
    }

    private drawPath(plan: JointPreviewPlan, toScreen: (point: Point) => Point) {
        if (plan.path === undefined) return 0;

        const onScreen = plan.path.map(toScreen);
        const coordinates = onScreen.flatMap((point) => [point.x, point.y]);
        this.graphics.poly(coordinates, false).stroke(PATH);

        return onScreen.length;
    }

    private drawEnds(plan: JointPreviewPlan, toScreen: (point: Point) => Point) {
        const onScreen = plan.ends.map(toScreen);

        for (const end of onScreen) {
            this.graphics.circle(end.x, end.y, END_RADIUS_PX).fill(ACCENT).stroke(END_EDGE);
        }

        return onScreen;
    }

    private drawLabel(plan: JointPreviewPlan, toScreen: (point: Point) => Point) {
        if (plan.label === undefined) return undefined;

        const at = toScreen(plan.label.at);
        if (this.label.text !== plan.label.text) {
            this.label.text = plan.label.text;
        }
        this.label.position.set(Math.round(at.x + LABEL_OFFSET_PX), Math.round(at.y + LABEL_OFFSET_PX));
        this.label.visible = true;

        return plan.label.text;
    }
}
