import { PathComponent, ShapeComponent, StyleComponent } from '../../../../core/components/index.ts';
import { colourAt, isGradient } from '../../../../core/fields/index.ts';
import type { GradientFill } from '../../../../core/fields/index.ts';
import type { Point } from '../../../../core/geometry/index.ts';
import type { Entity } from '../../../../core/level/index.ts';
import { FillPlacement } from '../../../commands/index.ts';
import type { GradientHandleRole } from '../../../commands/index.ts';
import type { OpenLevel } from '../../../session/index.ts';

// A press this close to a handle's middle, on screen, takes it.
export const GRADIENT_HANDLE_GRAB_PX = 8;

// A handle in level positions, with the colour the gradient has where it is.
export type GradientHandle = {
    readonly role: GradientHandleRole;
    readonly position: Point;
    readonly colour: string;
};

// A stop between the two handles, which only shows where it is.
export type GradientStopDot = {
    readonly position: Point;
    readonly colour: string;
};

// The handles of the one selected entity's gradient: a linear one's start and end, or a radial one's
// centre and radius dot, at the centre plus the radius along the box's own x, with the stops between them.
export class GradientHandles {
    readonly entity: Entity;
    readonly fill: GradientFill;
    readonly placement: FillPlacement;
    // The start or centre first, then the end or radius dot.
    readonly handles: readonly [GradientHandle, GradientHandle];
    // The stops not under a handle, those placed above 0% and below 100%.
    readonly stopDots: readonly GradientStopDot[];

    private constructor(entity: Entity, fill: GradientFill, placement: FillPlacement) {
        this.entity = entity;
        this.fill = fill;
        this.placement = placement;

        const [fromRole, from, toRole, to] =
            fill.kind === 'linear'
                ? (['start', fill.start, 'end', fill.end] as const)
                : (['centre', fill.centre, 'radius', { x: fill.centre.x + fill.radius, y: fill.centre.y }] as const);
        const fromPosition = placement.shareToLevel(from);
        const toPosition = placement.shareToLevel(to);

        this.handles = [
            { role: fromRole, position: fromPosition, colour: colourAt(fill.stops, 0) },
            { role: toRole, position: toPosition, colour: colourAt(fill.stops, 1) },
        ];
        this.stopDots = fill.stops
            .filter((stop) => stop.place > 0 && stop.place < 1)
            .map((stop) => ({ position: between(fromPosition, toPosition, stop.place), colour: stop.colour }));
    }

    // Only when exactly one entity is selected, it is neither hidden nor locked, its fill is a gradient
    // that paints, and its StyleComponent's card is unfolded, so its gradient is open in the Entity inspector.
    static of(openLevel: OpenLevel): GradientHandles | undefined {
        const { selection, caches, cardFolds } = openLevel;
        const only = selection.entities.length === 1 ? selection.entities[0] : undefined;
        if (only === undefined) return undefined;

        const isOut = caches.hidden.isHidden(only) || caches.hidden.isLocked(only);
        if (isOut) return undefined;

        const style = only.getComponent(StyleComponent);
        if (style === undefined || cardFolds.isFolded(StyleComponent.schema.typeName)) return undefined;

        const fill = style.get('fill');
        if (!isGradient(fill) || !fillPaints(only)) return undefined;

        const placement = FillPlacement.of(only, caches.worldMatrices.matrixOf(only));
        if (placement === undefined) return undefined;

        return new GradientHandles(only, fill, placement);
    }

    // The handle whose middle is nearest the point, within the grab distance on screen. Of two at the same
    // distance, the end or radius dot, drawn on top.
    handleAt(point: Point, zoom: number): GradientHandleRole | undefined {
        let nearest: GradientHandleRole | undefined;
        let nearestDistance = Infinity;

        for (const handle of this.handles) {
            const distance = Math.hypot(point.x - handle.position.x, point.y - handle.position.y) * zoom;
            if (distance > GRADIENT_HANDLE_GRAB_PX || distance > nearestDistance) continue;

            nearest = handle.role;
            nearestDistance = distance;
        }

        return nearest;
    }
}

// A line and an open path have no inside, so their fill never paints. A path is drawn before a shape.
function fillPaints(entity: Entity) {
    const path = entity.getComponent(PathComponent);
    if (path !== undefined) return path.get('path').closed;

    return entity.getComponent(ShapeComponent)?.get('geometry').kind !== 'line';
}

function between(from: Point, to: Point, share: number): Point {
    return { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share };
}
