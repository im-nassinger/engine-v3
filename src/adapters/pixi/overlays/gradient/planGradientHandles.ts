import type { Point } from '../../../../core/geometry/index.ts';

import type { ShownGradient, ShownGradientEdge } from './GradientSource.ts';

// A radial gradient's edge is cut into this many straight steps on screen.
export const EDGE_STEPS = 64;

// A dot on screen, with its #RRGGBBAA colour.
export type PlannedDot = {
    readonly centre: Point;
    readonly colour: string;
};

// What the gradient handle overlay draws, in screen pixels: the line between the handles, their two dots,
// the stops' smaller dots on the line, and a radial gradient's edge as a closed run of points.
export type GradientHandlesPlan = {
    readonly line: readonly [Point, Point];
    readonly ends: readonly [PlannedDot, PlannedDot];
    readonly stops: readonly PlannedDot[];
    readonly edge: readonly Point[] | undefined;
};

export type ScreenMapping = {
    levelToScreen(levelPoint: Point): Point;
};

export function planGradientHandles(gradient: ShownGradient, view: ScreenMapping): GradientHandlesPlan {
    const from = view.levelToScreen(gradient.from.position);
    const to = view.levelToScreen(gradient.to.position);

    return {
        line: [from, to],
        ends: [
            { centre: from, colour: gradient.from.colour },
            { centre: to, colour: gradient.to.colour },
        ],
        stops: gradient.stops.map((stop) => ({ centre: view.levelToScreen(stop.position), colour: stop.colour })),
        edge: gradient.edge === undefined ? undefined : edgeOnScreen(gradient.edge, view),
    };
}

// The ellipse in the entity's own space, taken to the screen: an ellipse still when the box isn't square,
// and turned or slanted with the entity.
function edgeOnScreen(edge: ShownGradientEdge, view: ScreenMapping) {
    const points: Point[] = [];

    for (let step = 0; step < EDGE_STEPS; step += 1) {
        const angle = (step / EDGE_STEPS) * 2 * Math.PI;
        const own = {
            x: edge.centre.x + Math.cos(angle) * edge.radiusX,
            y: edge.centre.y + Math.sin(angle) * edge.radiusY,
        };
        points.push(view.levelToScreen(edge.toLevel.apply(own)));
    }

    return points;
}
