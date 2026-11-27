import type { Point } from '../../../../../src/core/geometry/index.ts';

// Where everything in the chase level is, in level pixels: y grows downwards, the level's bottom edge is at
// 1200. Left to right: a meadow, a stream, a broken bridge over a river, a bramble ravine crossed on
// branches, the hollow of a giant tree, a slope of steps down to a pond, and the hut on the hill.
export type PlatformLook = 'earth' | 'plank' | 'branch' | 'log' | 'stump' | 'rock' | 'hollowTree';

export type Platform = {
    readonly name: string;
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly look: PlatformLook;
};

// A place that loses the run when the Blob touches it: water or brambles.
export type Hazard = {
    readonly name: string;
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly look: 'water' | 'brambles';
};

export const LEVEL_LEFT = -6800;
export const LEVEL_RIGHT = 6800;
export const LEVEL_TOP = -1200;
export const LEVEL_BOTTOM = 1200;

export const START: Point = { x: -6100, y: 400 };
// The hut's door, on the hill: reaching it wins.
export const HOME: Point = { x: 4750, y: 520 };

export const PLATFORMS: readonly Platform[] = [
    // The meadow, where the Blob wakes up, and a fallen log to hop.
    { name: 'Meadow', left: LEVEL_LEFT, top: 400, right: -5500, bottom: LEVEL_BOTTOM, look: 'earth' },
    { name: 'Fallen log', left: -5860, top: 348, right: -5740, bottom: 400, look: 'log' },
    // Past the stream: a stump, then a step up to the river bank.
    { name: 'Far bank', left: -5300, top: 400, right: -4200, bottom: LEVEL_BOTTOM, look: 'earth' },
    { name: 'Stump', left: -4760, top: 296, right: -4660, bottom: 400, look: 'stump' },
    { name: 'River bank', left: -4200, top: 270, right: -3400, bottom: LEVEL_BOTTOM, look: 'earth' },
    // The bridge over the river, with planks missing in the middle.
    { name: 'Bridge', left: -3400, top: 270, right: -2960, bottom: 294, look: 'plank' },
    { name: 'Bridge end', left: -2790, top: 270, right: -2300, bottom: 294, look: 'plank' },
    { name: 'Ravine edge', left: -2300, top: 270, right: -1500, bottom: LEVEL_BOTTOM, look: 'earth' },
    // Branches over the bramble ravine.
    { name: 'Branch 1', left: -1380, top: 200, right: -1180, bottom: 228, look: 'branch' },
    { name: 'Branch 2', left: -1040, top: 110, right: -840, bottom: 138, look: 'branch' },
    { name: 'Branch 3', left: -700, top: 170, right: -500, bottom: 198, look: 'branch' },
    { name: 'Branch 4', left: -360, top: 60, right: -180, bottom: 88, look: 'branch' },
    // The forest ledge: run through the hollow at the foot of a giant tree, too low to jump in, then hop a log.
    { name: 'Forest ledge', left: -100, top: 160, right: 1400, bottom: LEVEL_BOTTOM, look: 'earth' },
    { name: 'Old tree', left: 480, top: LEVEL_TOP, right: 920, bottom: 56, look: 'hollowTree' },
    { name: 'Ledge log', left: 1100, top: 104, right: 1210, bottom: 160, look: 'log' },
    // Steps down to the hollow, with two rocks on the way to the pond.
    { name: 'Slope 1', left: 1400, top: 300, right: 1800, bottom: LEVEL_BOTTOM, look: 'earth' },
    { name: 'Slope 2', left: 1800, top: 440, right: 2200, bottom: LEVEL_BOTTOM, look: 'earth' },
    { name: 'Hollow', left: 2200, top: 560, right: 3700, bottom: LEVEL_BOTTOM, look: 'earth' },
    { name: 'Rock', left: 2700, top: 494, right: 2810, bottom: 560, look: 'rock' },
    { name: 'Big rock', left: 3160, top: 470, right: 3260, bottom: 560, look: 'rock' },
    // Home: the hill past the pond, with the hut.
    { name: 'Home hill', left: 3950, top: 520, right: LEVEL_RIGHT, bottom: LEVEL_BOTTOM, look: 'earth' },
];

export const HAZARDS: readonly Hazard[] = [
    { name: 'Stream', left: -5500, top: 560, right: -5300, look: 'water' },
    { name: 'River', left: -3400, top: 560, right: -2300, look: 'water' },
    { name: 'Brambles', left: -1500, top: 640, right: -100, look: 'brambles' },
    { name: 'Pond', left: 3700, top: 640, right: 3950, look: 'water' },
];

// The ground the monster glides along, left to right: it passes through everything, so its path only
// follows the height the Blob runs at.
export const MONSTER_FLOOR: readonly Point[] = [
    { x: -6800, y: 400 },
    { x: -4300, y: 400 },
    { x: -4100, y: 270 },
    { x: -1500, y: 270 },
    { x: -100, y: 160 },
    { x: 1400, y: 160 },
    { x: 2200, y: 560 },
    { x: 3700, y: 560 },
    { x: 3950, y: 520 },
    { x: 6800, y: 520 },
];

// The highest ground at x: the top of the topmost platform there, or the level's bottom.
export function groundTopAt(x: number) {
    let top = LEVEL_BOTTOM;
    for (const platform of PLATFORMS) {
        if (x >= platform.left && x <= platform.right && platform.top < top) {
            top = platform.top;
        }
    }

    return top;
}
