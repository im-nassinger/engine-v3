import { Graphics } from 'pixi.js';
import type { StrokeStyle } from 'pixi.js';
import { JointComponent } from '../../../core/components/index.ts';
import type { JointType } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import { JOINT_ICON_RADIUS, jointIconCentres, jointIconRadiusPx } from '../../../editor/view/index.ts';
import type { OverlayScene } from './OverlayScene.ts';

// The design's joint icon: a white circle with a 1.5 px edge. Every size here is the one at 100%; the
// icon is scaled by the zoom as a whole, as jointIconRadiusPx says.
const EDGE_COLOUR = 0x1d2430;
const EDGE_WIDTH = 1.5;
const HINGE_DOT_RADIUS = 2;
const ROPE_HALF_LENGTH = 3.5;
const SPRING_ZIGZAG: readonly Point[] = [
    { x: -4, y: 0 },
    { x: -2, y: -2.5 },
    { x: 0, y: 2.5 },
    { x: 2, y: -2.5 },
    { x: 4, y: 0 },
];

export type ShownJointIcon = {
    readonly joint: Entity;
    readonly type: JointType;
    readonly screenPosition: Point;
};

// Hidden when the joint or any of its parents is. The physics view, unlike this, ignores the eye.
function isHiddenWithParents(entity: Entity) {
    let current: Entity | undefined = entity;

    while (current !== undefined) {
        if (current.isHidden) return true;
        current = current.parent;
    }

    return false;
}

function isOffScreen(position: Point, radiusPx: number, scene: OverlayScene) {
    const size = scene.view.size;
    const margin = radiusPx + 1;

    return (
        position.x < -margin ||
        position.y < -margin ||
        position.x > size.width + margin ||
        position.y > size.height + margin
    );
}

// One icon per Hinge at its position and one on each end of a Rope or Spring, growing and shrinking with the zoom as the level does: Hinge has a dot in the middle, Rope a short
// upright line, Spring a small zigzag. Editor only, never drawn in play; hidden by its View menu switch and
// with the joint's eye.
export class JointIconOverlay {
    readonly graphics = new Graphics();
    private shown: readonly ShownJointIcon[] = [];

    // The icons drawn last, for tests.
    get shownIcons() {
        return this.shown;
    }

    update(scene: OverlayScene) {
        this.clear();

        const level = scene.level;
        const caches = scene.caches;
        const isOn = scene.settings.isOn('jointIcons');
        this.graphics.visible = isOn;
        if (!isOn || level === undefined || caches === undefined) return;

        const shown: ShownJointIcon[] = [];
        const radiusPx = jointIconRadiusPx(scene.view.zoom);
        const scale = radiusPx / JOINT_ICON_RADIUS;

        for (const entity of level.entitiesInDrawOrder()) {
            const joint = entity.getComponent(JointComponent);
            if (joint === undefined || isHiddenWithParents(entity)) continue;

            const matrix = caches.worldMatrices.matrixOf(entity);
            const type = joint.get('type');
            for (const centre of jointIconCentres(entity, matrix)) {
                const screenPosition = scene.view.levelToScreen(centre);
                if (isOffScreen(screenPosition, radiusPx, scene)) continue;

                this.drawIcon(type, screenPosition, scale);
                shown.push({ joint: entity, type, screenPosition });
            }
        }

        this.shown = shown;
    }

    // Draws no icon, whatever the switch says: play shows none.
    clear() {
        this.graphics.clear();
        this.shown = [];
    }

    destroy() {
        this.graphics.destroy();
    }

    private drawIcon(type: JointType, centre: Point, scale: number) {
        const graphics = this.graphics;
        const edge: StrokeStyle = { color: EDGE_COLOUR, width: EDGE_WIDTH * scale };
        const mark: StrokeStyle = { ...edge, cap: 'round', join: 'round' };
        const radius = JOINT_ICON_RADIUS * scale;
        graphics.circle(centre.x, centre.y, radius).fill(0xffffff).stroke(edge);

        switch (type) {
            case 'hinge': {
                const dotRadius = HINGE_DOT_RADIUS * scale;
                graphics.circle(centre.x, centre.y, dotRadius).fill(EDGE_COLOUR);
                return;
            }
            case 'rope': {
                const halfLength = ROPE_HALF_LENGTH * scale;
                graphics
                    .moveTo(centre.x, centre.y - halfLength)
                    .lineTo(centre.x, centre.y + halfLength)
                    .stroke(mark);
                return;
            }
            case 'spring': {
                const [first, ...rest] = SPRING_ZIGZAG;
                if (first === undefined) return;

                graphics.moveTo(centre.x + first.x * scale, centre.y + first.y * scale);
                for (const point of rest) {
                    graphics.lineTo(centre.x + point.x * scale, centre.y + point.y * scale);
                }
                graphics.stroke(mark);
                return;
            }
        }
    }
}
