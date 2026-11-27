import type { Point } from '../../../../../src/core/geometry/index.ts';

import { glow, gradientPart, part, verticalGradient } from '../../platformer/art/artEntities.ts';
import type { ArtPart } from '../../platformer/art/blobArt.ts';
import { ellipsePath, sharpPath, smoothClosedPath } from '../../platformer/art/pathShapes.ts';
import { WOOD } from './palette.ts';
import { roundedBox } from './shapes.ts';

// The Blob's home on the hill: a round little hut with a lit doorway and window, and a lantern by the
// door. Drawn round the middle of its doorstep at (0, 0), front parts first.
const LIGHT = '#FFD27AFF';
const LIGHT_GLOW = '#FFC062FF';
const ROOF = '#6B3A5CFF';
const ROOF_DARK = '#4E2945FF';
const WALL_TOP = '#B77B55FF';
const WALL_BOTTOM = '#7E4E38FF';

function lantern(base: Point): ArtPart[] {
    const lampY = base.y - 150;

    return [
        part('Lamp', roundedBox(base.x - 9, lampY - 14, base.x + 9, lampY + 14, 6), LIGHT),
        part('Lamp cap', roundedBox(base.x - 13, lampY - 22, base.x + 13, lampY - 13, 4), WOOD.post),
        part('Hook', roundedBox(base.x - 2, lampY - 34, base.x + 30, lampY - 28, 3), WOOD.post),
        part('Post', roundedBox(base.x + 24, lampY - 34, base.x + 34, base.y, 4), WOOD.post),
        gradientPart('Lamp glow', ellipsePath({ x: base.x, y: lampY }, 110, 110), LIGHT_GLOW, glow(LIGHT_GLOW, '90')),
    ];
}

export function homeParts(): ArtPart[] {
    const window = { x: 82, y: -120 };

    return [
        ...lantern({ x: -150, y: 0 }),
        part('Step', roundedBox(-56, -12, 56, 4, 5), WOOD.bark),
        part('Door light', roundedBox(-30, -112, 30, -10, 30), '#FFF1C4FF'),
        part('Door', roundedBox(-42, -128, 42, -10, 42), LIGHT),
        part('Door frame', roundedBox(-52, -140, 52, -8, 52), WOOD.post),
        part('Window bar', roundedBox(window.x - 2, window.y - 22, window.x + 2, window.y + 22, 2), WOOD.post),
        part('Window bar', roundedBox(window.x - 22, window.y - 2, window.x + 22, window.y + 2, 2), WOOD.post),
        part('Window', ellipsePath(window, 24, 24), LIGHT),
        part('Window frame', ellipsePath(window, 31, 31), WOOD.post),
        part('Chimney smoke', ellipsePath({ x: 112, y: -330 }, 18, 14), '#F2D6E2A0'),
        part('Chimney smoke', ellipsePath({ x: 134, y: -368 }, 13, 10), '#F2D6E270'),
        part(
            'Roof',
            smoothClosedPath([
                { x: -190, y: -168, sharp: true },
                { x: -60, y: -300 },
                { x: 0, y: -318 },
                { x: 60, y: -300 },
                { x: 190, y: -168, sharp: true },
                { x: 0, y: -186 },
            ]),
            ROOF,
        ),
        part('Chimney', roundedBox(88, -310, 124, -230, 6), ROOF_DARK),
        gradientPart('Walls', roundedBox(-150, -220, 150, 0, 34), WALL_TOP, verticalGradient([WALL_TOP, WALL_BOTTOM])),
        gradientPart('House glow', ellipsePath({ x: 0, y: -120 }, 340, 260), LIGHT_GLOW, glow(LIGHT_GLOW, '50')),
        part(
            'Path',
            sharpPath([
                { x: -50, y: 2 },
                { x: 50, y: 2 },
                { x: 90, y: 14 },
                { x: -90, y: 14 },
            ]),
            '#D9B36AFF',
        ),
    ];
}
