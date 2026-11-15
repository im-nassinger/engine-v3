import { Graphics } from 'pixi.js';
import type { StrokeStyle } from 'pixi.js';
import { JointComponent } from '../../../core/components/index.ts';
import type { JointType } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { OverlayScene } from './OverlayScene.ts';

// The design's joint icon: a 14 px white circle with a 1.5 px edge.
export const JOINT_ICON_RADIUS_PX = 7;
const EDGE_COLOUR = 0x1d2430;
const EDGE: StrokeStyle = { color: EDGE_COLOUR, width: 1.5 };
const MARK: StrokeStyle = { color: EDGE_COLOUR, width: 1.5, cap: 'round', join: 'round' };
const HINGE_DOT_RADIUS_PX = 2;
const ROPE_HALF_LENGTH_PX = 3.5;
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

function isOffScreen(position: Point, scene: OverlayScene) {
    const size = scene.view.size;
    const margin = JOINT_ICON_RADIUS_PX + 1;

    return (
        position.x < -margin ||
        position.y < -margin ||
        position.x > size.width + margin ||
        position.y > size.height + margin
    );
}

// One icon per joint at its position, the same size at any zoom: Hinge has a dot in the middle, Rope a short
// upright line, Spring a small zigzag. Editor only; hidden by its View menu switch and with the joint's eye.
export class JointIconOverlay {
    readonly graphics = new Graphics();
    private shown: readonly ShownJointIcon[] = [];

    // The icons drawn last, for tests.
    get shownIcons() {
        return this.shown;
    }

    update(scene: OverlayScene) {
        this.graphics.clear();
        this.shown = [];

        const level = scene.level;
        const caches = scene.caches;
        const isOn = scene.settings.isOn('jointIcons');
        this.graphics.visible = isOn;
        if (!isOn || level === undefined || caches === undefined) return;

        const shown: ShownJointIcon[] = [];

        for (const entity of level.entitiesInDrawOrder()) {
            const joint = entity.getComponent(JointComponent);
            if (joint === undefined || isHiddenWithParents(entity)) continue;

            const matrix = caches.worldMatrices.matrixOf(entity);
            const screenPosition = scene.view.levelToScreen({ x: matrix.tx, y: matrix.ty });
            if (isOffScreen(screenPosition, scene)) continue;

            const type = joint.get('type');
            this.drawIcon(type, screenPosition);
            shown.push({ joint: entity, type, screenPosition });
        }

        this.shown = shown;
    }

    destroy() {
        this.graphics.destroy();
    }

    private drawIcon(type: JointType, centre: Point) {
        const graphics = this.graphics;
        graphics.circle(centre.x, centre.y, JOINT_ICON_RADIUS_PX).fill(0xffffff).stroke(EDGE);

        switch (type) {
            case 'hinge':
                graphics.circle(centre.x, centre.y, HINGE_DOT_RADIUS_PX).fill(EDGE_COLOUR);
                return;
            case 'rope':
                graphics
                    .moveTo(centre.x, centre.y - ROPE_HALF_LENGTH_PX)
                    .lineTo(centre.x, centre.y + ROPE_HALF_LENGTH_PX)
                    .stroke(MARK);
                return;
            case 'spring': {
                const [first, ...rest] = SPRING_ZIGZAG;
                if (first === undefined) return;

                graphics.moveTo(centre.x + first.x, centre.y + first.y);
                for (const point of rest) {
                    graphics.lineTo(centre.x + point.x, centre.y + point.y);
                }
                graphics.stroke(MARK);
                return;
            }
        }
    }
}
