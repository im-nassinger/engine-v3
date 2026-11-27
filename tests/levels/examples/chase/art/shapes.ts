import type { PathGeometry, Point } from '../../../../../src/core/geometry/index.ts';

import { sharpPath, smoothClosedPath } from '../../platformer/art/pathShapes.ts';
import type { OutlinePoint } from '../../platformer/art/pathShapes.ts';
import type { SeededRandom } from './random.ts';

// Outlines the chase level's art is drawn from: flat shapes with soft or crisp edges, as in the owner's
// reference pictures.

// A round outline with scalloped edges, such as a tree's canopy or a bush: `bumps` round lobes.
export function bumpyPath(centre: Point, radiusX: number, radiusY: number, bumps: number, depth = 0.08) {
    const outline: Point[] = [];
    const count = bumps * 4;
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * 2 * Math.PI;
        const swell = 1 + depth * Math.abs(Math.cos((bumps * angle) / 2)) - depth / 2;
        outline.push({
            x: centre.x + Math.cos(angle) * radiusX * swell,
            y: centre.y + Math.sin(angle) * radiusY * swell,
        });
    }

    return smoothClosedPath(outline);
}

// A rectangle whose corners are rounded by `radius`, from its left, top, right and bottom edges.
export function roundedBox(left: number, top: number, right: number, bottom: number, radius: number) {
    const corner = Math.min(radius, (right - left) / 2, (bottom - top) / 2);
    const inset = corner * 0.3;

    return smoothClosedPath([
        { x: left + corner, y: top, sharp: true },
        { x: right - corner, y: top, sharp: true },
        { x: right - inset, y: top + inset },
        { x: right, y: top + corner, sharp: true },
        { x: right, y: bottom - corner, sharp: true },
        { x: right - inset, y: bottom - inset },
        { x: right - corner, y: bottom, sharp: true },
        { x: left + corner, y: bottom, sharp: true },
        { x: left + inset, y: bottom - inset },
        { x: left, y: bottom - corner, sharp: true },
        { x: left, y: top + corner, sharp: true },
        { x: left + inset, y: top + inset },
    ]);
}

// A band along a straight top edge whose lower edge waves, such as grass hanging over soil.
export function wavyBand(left: number, top: number, right: number, height: number, wave: number, step = 36) {
    const outline: OutlinePoint[] = [
        { x: left, y: top, sharp: true },
        { x: right, y: top, sharp: true },
    ];
    const count = Math.max(2, Math.round((right - left) / step));
    for (let i = 0; i <= count; i++) {
        const x = right - ((right - left) * i) / count;
        const dip = i % 2 === 0 ? wave : 0;
        const sharp = i === 0 || i === count;
        outline.push({ x, y: top + height + dip, sharp });
    }

    return smoothClosedPath(outline);
}

// A jagged top edge over a solid block down to `bottom`: brambles, or a fringe of grass blades.
export function spikyTop(left: number, top: number, right: number, bottom: number, random: SeededRandom, spike = 46) {
    const points: Point[] = [{ x: left, y: bottom }];
    let x = left;
    while (x < right) {
        const width = random.between(spike * 0.5, spike);
        points.push({ x: x + width * 0.5, y: top - random.between(spike * 0.3, spike) });
        points.push({ x: Math.min(right, x + width), y: top + random.between(0, spike * 0.4) });
        x += width;
    }
    points.push({ x: right, y: bottom });

    return sharpPath(points);
}

// A tuft of pointed leaves fanning up from its base, as in the purple forest reference.
export function tuftPath(base: Point, height: number, leaves: number, spread = 0.9) {
    const outline: OutlinePoint[] = [{ x: base.x + height * 0.18, y: base.y, sharp: true }];
    for (let i = leaves - 1; i >= 0; i--) {
        const share = leaves === 1 ? 0.5 : i / (leaves - 1);
        const angle = (share - 0.5) * 2 * spread;
        const length = height * (1 - Math.abs(share - 0.5) * 0.5);
        const tip = { x: base.x + Math.sin(angle) * length, y: base.y - Math.cos(angle) * length };
        outline.push({ x: tip.x, y: tip.y, sharp: true });
        if (i > 0) {
            const nextAngle = ((i - 1) / (leaves - 1) - 0.5) * 2 * spread;
            const valleyAngle = (angle + nextAngle) / 2;
            const valley = height * 0.35;
            outline.push({ x: base.x + Math.sin(valleyAngle) * valley, y: base.y - Math.cos(valleyAngle) * valley });
        }
    }
    outline.push({ x: base.x - height * 0.18, y: base.y, sharp: true });

    return smoothClosedPath(outline);
}

// A four-pointed sparkle, for the brightest stars.
export function starPath(centre: Point, radius: number) {
    const points: Point[] = [];
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * 2 * Math.PI;
        const reach = i % 2 === 0 ? radius : radius * 0.32;
        points.push({ x: centre.x + Math.sin(angle) * reach, y: centre.y - Math.cos(angle) * reach });
    }

    return sharpPath(points);
}

// A path moved by an offset, handles and all.
export function movedPath(path: PathGeometry, offset: Point): PathGeometry {
    const points = path.points.map((point) => ({ ...point, x: point.x + offset.x, y: point.y + offset.y }));

    return { closed: path.closed, points };
}
