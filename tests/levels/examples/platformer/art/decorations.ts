import type { Point } from '../../../../../src/core/geometry/index.ts';

import { part } from './artEntities.ts';
import type { ArtPart } from './blobArt.ts';
import { ellipsePath, roundOutline, smilePath, smoothClosedPath } from './pathShapes.ts';

// The small monsters standing around the course, in the reference's style: one bright flat colour, dot
// eyes, a tiny smile, stubby legs. Each is drawn round its feet at (0, 0), front parts first.
const FACE = '#2A2238FF';
const CHEEK = '#FF8FB1C0';

function face(centre: Point, eyeGap: number, eyeSize: number): ArtPart[] {
    const eyeRadiusY = eyeSize * 1.3;
    const left = { x: centre.x - eyeGap, y: centre.y };
    const right = { x: centre.x + eyeGap, y: centre.y };
    const mouthCentre = { x: centre.x, y: centre.y + eyeSize * 2.2 };

    return [
        part('Mouth', smilePath(mouthCentre, eyeSize * 2.6, eyeSize * 1.1), FACE),
        part('Eye', ellipsePath(left, eyeSize, eyeRadiusY), FACE),
        part('Eye', ellipsePath(right, eyeSize, eyeRadiusY), FACE),
    ];
}

function cheeks(centre: Point, gap: number): ArtPart[] {
    return [
        part('Cheek', ellipsePath({ x: centre.x - gap, y: centre.y }, 5, 3), CHEEK),
        part('Cheek', ellipsePath({ x: centre.x + gap, y: centre.y }, 5, 3), CHEEK),
    ];
}

function stubbyLegs(spacing: number, length: number, width: number, colour: string): ArtPart[] {
    const halfLength = length / 2;

    return [
        part('Leg', smoothClosedPath(roundOutline({ x: -spacing, y: -halfLength }, width, halfLength, 3, 10)), colour),
        part('Leg', smoothClosedPath(roundOutline({ x: spacing, y: -halfLength }, width, halfLength, 3, 10)), colour),
    ];
}

export function pinkAntennae(): ArtPart[] {
    const colour = '#FF7FA8FF';
    const bodyCentre = { x: 0, y: -44 };

    return [
        ...face({ x: 0, y: -48 }, 9, 3.6),
        ...cheeks({ x: 0, y: -38 }, 17),
        part('Body', smoothClosedPath(roundOutline(bodyCentre, 30, 30, 2.2, 12)), colour),
        part('Antenna', ellipsePath({ x: -16, y: -86 }, 6, 6), colour),
        part('Antenna', ellipsePath({ x: 16, y: -86 }, 6, 6), colour),
        part('Stalk', smoothClosedPath(roundOutline({ x: -12, y: -76 }, 2.5, 8, 3, 8)), colour),
        part('Stalk', smoothClosedPath(roundOutline({ x: 12, y: -76 }, 2.5, 8, 3, 8)), colour),
        ...stubbyLegs(12, 18, 6, colour),
    ];
}

export function yellowChick(): ArtPart[] {
    const colour = '#F7D63BFF';
    const beak = smoothClosedPath([
        { x: 22, y: -42, sharp: true },
        { x: 34, y: -37, sharp: true },
        { x: 22, y: -33, sharp: true },
    ]);

    return [
        part('Beak', beak, '#FF9A3DFF'),
        ...face({ x: 10, y: -46 }, 7, 3),
        part('Body', smoothClosedPath(roundOutline({ x: 0, y: -32 }, 26, 28, 2, 12)), colour),
        part('Wing', ellipsePath({ x: -18, y: -28 }, 9, 6), '#E6C226FF'),
        ...stubbyLegs(8, 8, 3, '#FF9A3DFF'),
    ];
}

export function orangeTwin(): ArtPart[] {
    const colour = '#FF8A3DFF';

    return [
        ...face({ x: -14, y: -52 }, 6, 3),
        ...face({ x: 14, y: -52 }, 6, 3),
        part('Lobe', smoothClosedPath(roundOutline({ x: -14, y: -50 }, 18, 30, 2.2, 12)), colour),
        part('Lobe', smoothClosedPath(roundOutline({ x: 14, y: -50 }, 18, 30, 2.2, 12)), colour),
        ...stubbyLegs(14, 22, 5, colour),
    ];
}

export function purpleBlock(): ArtPart[] {
    const colour = '#9B6BE8FF';

    return [
        ...face({ x: 0, y: -70 }, 8, 3.2),
        part('Body', smoothClosedPath(roundOutline({ x: 0, y: -62 }, 22, 34, 5, 16)), colour),
        ...stubbyLegs(9, 30, 4.5, colour),
    ];
}

export function greenSprout(): ArtPart[] {
    const colour = '#8CCB3AFF';

    return [
        ...face({ x: 0, y: -34 }, 9, 3.2),
        ...cheeks({ x: 0, y: -24 }, 16),
        part('Body', smoothClosedPath(roundOutline({ x: 0, y: -30 }, 30, 26, 2.2, 12)), colour),
        part('Leaf', ellipsePath({ x: -10, y: -62 }, 6, 12), '#5FAE2EFF'),
        part('Leaf', ellipsePath({ x: 10, y: -62 }, 6, 12), '#5FAE2EFF'),
        ...stubbyLegs(12, 8, 6, colour),
    ];
}

export function cloud(width: number): ArtPart[] {
    const colour = '#FFFFFFFF';
    const half = width / 2;

    return [
        part('Puff', ellipsePath({ x: -half * 0.45, y: -half * 0.25 }, half * 0.45, half * 0.38), colour),
        part('Puff', ellipsePath({ x: half * 0.15, y: -half * 0.38 }, half * 0.5, half * 0.45), colour),
        part('Puff', smoothClosedPath(roundOutline({ x: 0, y: 0 }, half, half * 0.3, 3, 14)), colour),
    ];
}

export function hill(width: number, height: number, colour: string): ArtPart[] {
    const outline = [
        { x: -width / 2, y: 0, sharp: true },
        { x: -width * 0.3, y: -height * 0.7 },
        { x: 0, y: -height },
        { x: width * 0.3, y: -height * 0.7 },
        { x: width / 2, y: 0, sharp: true },
    ];

    return [part('Hill', smoothClosedPath(outline), colour)];
}

// The goal: a flower on a stem.
export function flower(): ArtPart[] {
    const petals: ArtPart[] = [];
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * 2 * Math.PI;
        const centre = { x: Math.cos(angle) * 22, y: -90 + Math.sin(angle) * 22 };
        petals.push(part('Petal', ellipsePath(centre, 15, 15), '#FF7FA8FF'));
    }

    return [
        ...face({ x: 0, y: -94 }, 7, 2.8),
        part('Centre', ellipsePath({ x: 0, y: -90 }, 20, 20), '#FFD45CFF'),
        ...petals,
        part('Leaf', ellipsePath({ x: 16, y: -30 }, 14, 7), '#5FAE2EFF'),
        part('Stem', smoothClosedPath(roundOutline({ x: 0, y: -36 }, 4, 36, 4, 10)), '#5FAE2EFF'),
    ];
}
