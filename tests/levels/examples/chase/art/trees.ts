import type { Point } from '../../../../../src/core/geometry/index.ts';

import { part } from '../../platformer/art/artEntities.ts';
import type { ArtPart } from '../../platformer/art/blobArt.ts';
import { ellipsePath, leafPath, sharpPath, smoothClosedPath } from '../../platformer/art/pathShapes.ts';
import { LEAVES, LEAVES_SHADE, TRUNK } from './palette.ts';
import type { SeededRandom } from './random.ts';
import { roundedBox } from './shapes.ts';

// The near trees, after the owner's tree sheet: flat geometric shapes, a thin trunk, a few branch lines,
// and a darker inner shape. Each is drawn standing on `base`, `height` tall, front parts first.

type Colours = { readonly leaf: string; readonly shade: string };

function colours(random: SeededRandom): Colours {
    const index = Math.floor(random.next() * LEAVES.length);

    return { leaf: LEAVES[index] ?? '', shade: LEAVES_SHADE[index] ?? '' };
}

function trunk(base: Point, top: number, width = 7) {
    return part('Trunk', roundedBox(base.x - width / 2, top, base.x + width / 2, base.y, width / 2), TRUNK);
}

// A thin branch line from the trunk out and up.
function twig(from: Point, length: number, side: 1 | -1) {
    const to = { x: from.x + side * length * 0.7, y: from.y - length * 0.7 };

    return part(
        'Twig',
        smoothClosedPath([
            { x: from.x - 2.5, y: from.y, sharp: true },
            { x: to.x - 1.5, y: to.y, sharp: true },
            { x: to.x + 1.5, y: to.y, sharp: true },
            { x: from.x + 2.5, y: from.y, sharp: true },
        ]),
        TRUNK,
    );
}

function roundTree(base: Point, height: number, look: Colours): ArtPart[] {
    const radius = height * 0.3;
    const centre = { x: base.x, y: base.y - height + radius };

    return [
        twig({ x: base.x, y: centre.y + radius * 0.3 }, radius * 0.6, 1),
        twig({ x: base.x, y: centre.y + radius * 0.6 }, radius * 0.45, -1),
        trunk(base, centre.y - radius * 0.6),
        part('Glow', ellipsePath({ x: base.x, y: centre.y + radius * 0.78 }, radius * 0.6, radius * 0.22), look.shade),
        part('Canopy', ellipsePath(centre, radius, radius), look.leaf),
    ];
}

function capsuleTree(base: Point, height: number, look: Colours): ArtPart[] {
    const halfWidth = height * 0.15;
    const top = base.y - height;
    const bottom = base.y - height * 0.3;

    return [
        twig({ x: base.x, y: bottom - height * 0.15 }, halfWidth * 0.8, 1),
        twig({ x: base.x, y: bottom - height * 0.32 }, halfWidth * 0.8, -1),
        trunk(base, top + halfWidth),
        part('Shade', ellipsePath({ x: base.x, y: bottom - 3 }, halfWidth * 0.6, 8), look.shade),
        part('Canopy', roundedBox(base.x - halfWidth, top, base.x + halfWidth, bottom, halfWidth), look.leaf),
    ];
}

function flameTree(base: Point, height: number, look: Colours): ArtPart[] {
    const canopyBase = { x: base.x, y: base.y - height * 0.12 };

    return [
        part('Heart', leafPath(canopyBase, height * 0.5, height * 0.2, 0), look.shade),
        part('Canopy', leafPath(canopyBase, height * 0.88, height * 0.34, 0), look.leaf),
        trunk(base, canopyBase.y - 10, 6),
    ];
}

function pineTree(base: Point, height: number, look: Colours): ArtPart[] {
    const halfWidth = height * 0.24;
    const groundY = base.y - height * 0.08;

    return [
        part(
            'Inner',
            sharpPath([
                { x: base.x - halfWidth * 0.55, y: groundY },
                { x: base.x, y: base.y - height * 0.62 },
                { x: base.x + halfWidth * 0.55, y: groundY },
            ]),
            look.shade,
        ),
        part(
            'Pine',
            sharpPath([
                { x: base.x - halfWidth, y: groundY },
                { x: base.x, y: base.y - height },
                { x: base.x + halfWidth, y: groundY },
            ]),
            look.leaf,
        ),
        trunk(base, groundY - 4, 6),
    ];
}

function cloudTree(base: Point, height: number, look: Colours): ArtPart[] {
    const pads = [
        { x: base.x, y: base.y - height * 0.92, width: height * 0.34 },
        { x: base.x - height * 0.22, y: base.y - height * 0.68, width: height * 0.26 },
        { x: base.x + height * 0.2, y: base.y - height * 0.52, width: height * 0.24 },
    ];
    const parts: ArtPart[] = [];
    for (const pad of pads) {
        const half = pad.width / 2;
        const padHeight = pad.width * 0.4;
        parts.push(
            part(
                'Pad shade',
                roundedBox(
                    pad.x - half * 0.4,
                    pad.y + padHeight * 0.3,
                    pad.x + half * 0.4,
                    pad.y + padHeight * 0.62,
                    5,
                ),
                look.shade,
            ),
        );
        parts.push(
            part(
                'Pad',
                roundedBox(pad.x - half, pad.y - padHeight / 2, pad.x + half, pad.y + padHeight / 2, padHeight / 2),
                look.leaf,
            ),
        );
    }
    for (const pad of pads.slice(1)) {
        const stemY = pad.y + 10;
        parts.push(
            part(
                'Branch',
                roundedBox(Math.min(base.x, pad.x) - 2, stemY, Math.max(base.x, pad.x) + 2, stemY + 5, 2.5),
                TRUNK,
            ),
        );
    }

    return [...parts, trunk(base, base.y - height * 0.92, 6)];
}

const SHAPES = [roundTree, capsuleTree, flameTree, pineTree, cloudTree];

export function nearTree(base: Point, height: number, random: SeededRandom): ArtPart[] {
    const draw = random.pick(SHAPES);

    return draw(base, height, colours(random));
}
