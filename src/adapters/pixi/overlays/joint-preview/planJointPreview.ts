import { JointComponent } from '../../../../core/components/index.ts';
import type { Bounds, Point } from '../../../../core/geometry/index.ts';
import type { Entity, Level } from '../../../../core/level/index.ts';
import { jointPathPoints } from '../../../../core/physics/index.ts';
import type { OverlayCaches } from '../OverlayScene.ts';

import type { JointPreviewSource, ShownJointPreview } from './JointPreviewSource.ts';

// What the joint preview overlay draws, in level positions. The overlay turns it into screen pixels.
export type JointPreviewPlan = {
    // A Rope's straight line or a Spring's zigzag from the first end to the mouse.
    readonly path: readonly Point[] | undefined;
    // The ends placed so far and the snapped mouse, each a dot.
    readonly ends: readonly Point[];
    // The drawn bounds of the entities a click would join.
    readonly outlined: readonly Bounds[];
    readonly label: { readonly text: string; readonly at: Point } | undefined;
    // From each linked joint's position to the centres of its two entities.
    readonly links: readonly (readonly [Point, Point])[];
};

export type JointPreviewCaches = Pick<OverlayCaches, 'bounds' | 'worldMatrices'>;

type JointPreviewInput = Pick<JointPreviewSource, 'preview' | 'linkedJoints'>;

export function planJointPreview(input: JointPreviewInput, level: Level, caches: JointPreviewCaches): JointPreviewPlan {
    const links = input.linkedJoints.flatMap((joint) => linksOf(joint, level, caches));
    const preview = input.preview;
    if (preview === undefined) return { path: undefined, ends: [], outlined: [], label: undefined, links };

    const outlined: Bounds[] = [];
    for (const entity of [preview.a, preview.b]) {
        if (entity === undefined || entity === null) continue;

        const bounds = caches.bounds.subtreeBoundsOf(entity);
        if (bounds !== undefined) {
            outlined.push(bounds);
        }
    }

    const label = preview.label === undefined ? undefined : { text: preview.label, at: preview.mouse };

    return { path: pathOf(preview), ends: [...preview.ends, preview.mouse], outlined, label, links };
}

function pathOf(preview: ShownJointPreview) {
    const [first] = preview.ends;
    if (preview.type === 'hinge' || first === undefined) return undefined;

    const path = jointPathPoints(preview.type, first, preview.mouse);

    return path.points.map((point) => ({ x: point.x, y: point.y }));
}

// A missing or emptied end has no line; an empty B is the background, which has no centre.
function linksOf(joint: Entity, level: Level, caches: JointPreviewCaches) {
    const component = joint.getComponent(JointComponent);
    if (component === undefined) return [];

    const matrix = caches.worldMatrices.matrixOf(joint);
    const position = { x: matrix.tx, y: matrix.ty };
    const lines: (readonly [Point, Point])[] = [];

    for (const id of [component.get('a'), component.get('b')]) {
        const end = id === null ? undefined : level.findEntity(id);
        if (end === undefined) continue;

        lines.push([position, centreOf(end, caches)]);
    }

    return lines;
}

// The centre of the entity's own bounds, or its subtree's for a body made of its children, or else its
// position.
function centreOf(entity: Entity, caches: JointPreviewCaches) {
    const bounds = caches.bounds.ownBoundsOf(entity) ?? caches.bounds.subtreeBoundsOf(entity);
    if (bounds !== undefined) return bounds.centre;

    const matrix = caches.worldMatrices.matrixOf(entity);

    return { x: matrix.tx, y: matrix.ty };
}
