import type { Point } from '../../../core/geometry/index.ts';
import type { ShapeDrawing } from '../../commands/index.ts';

import { rotationBy, turnedAround } from './previewTurn.ts';

// The kinds drawn by a box: a click or a drag, not point by point.
export type BoxKind = 'rectangle' | 'circle';

// The size a click places, in the current group's own space: a rectangle's sides, a circle's width across.
export type BoxSize = {
    readonly width: number;
    readonly height: number;
};

export type BoxDrag = {
    readonly kind: BoxKind;
    // The press and the moving corner, in the current group's own space.
    readonly start: Point;
    readonly corner: Point;
    readonly shift: boolean;
    readonly alt: boolean;
    // How far Z and X turned the preview, in degrees clockwise: the box's sides follow it.
    readonly rotation: number;
};

// The requirement: a rectangle at least 1 px on each side, a circle at least 1 px across.
export const MIN_SIDE_PX = 1;

// The shape a click places, centred on the point, turned by the degrees clockwise.
export function placedDrawing(kind: BoxKind, size: BoxSize, centre: Point, rotation: number): ShapeDrawing {
    return { geometry: geometryOf(kind, size), position: centre, rotation };
}

// The box a drag sets: Shift keeps a square, Alt draws from the press as the centre, and a circle is always
// square, the circle that fits the box. A turned box is measured along its own sides, from the press to the
// mouse. Sides may be 0 until the release.
export function draggedBox(drag: BoxDrag): { readonly size: BoxSize; readonly centre: Point } {
    // The mouse as seen from the box's own axes, with the press as their origin.
    const along = turnedAround(drag.corner, drag.start, -drag.rotation);
    let dx = along.x - drag.start.x;
    let dy = along.y - drag.start.y;

    const isSquare = drag.shift || drag.kind === 'circle';
    if (isSquare) {
        const side = Math.max(Math.abs(dx), Math.abs(dy));
        dx = side * directionOf(dx);
        dy = side * directionOf(dy);
    }

    if (drag.alt) {
        return { size: { width: 2 * Math.abs(dx), height: 2 * Math.abs(dy) }, centre: drag.start };
    }

    const half = rotationBy(drag.rotation).apply({ x: dx / 2, y: dy / 2 });
    const centre = { x: drag.start.x + half.x, y: drag.start.y + half.y };

    return { size: { width: Math.abs(dx), height: Math.abs(dy) }, centre };
}

// A released drag's size, each side at least 1 px.
export function atLeastOnePixel(size: BoxSize): BoxSize {
    return { width: Math.max(size.width, MIN_SIDE_PX), height: Math.max(size.height, MIN_SIDE_PX) };
}

function geometryOf(kind: BoxKind, size: BoxSize): ShapeDrawing['geometry'] {
    if (kind === 'circle') return { kind: 'circle', radius: size.width / 2 };

    return { kind: 'rectangle', width: size.width, height: size.height };
}

// A side of 0 grows to the right or down, as if dragged that way.
function directionOf(delta: number) {
    return delta < 0 ? -1 : 1;
}
