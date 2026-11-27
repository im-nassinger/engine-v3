import { ellipsePath, sharpPath, smoothClosedPath, turnedEllipsePath } from '../../platformer/art/pathShapes.ts';
import { glow, gradientPart, part, verticalGradient } from '../../platformer/art/artEntities.ts';
import type { ArtPart } from '../../platformer/art/blobArt.ts';
import { BRAMBLE, EARTH, LEAVES, LEAVES_SHADE, STONE, WATER, WOOD } from '../art/palette.ts';
import type { SeededRandom } from '../art/random.ts';
import { bumpyPath, roundedBox, spikyTop, wavyBand } from '../art/shapes.ts';
import { LEVEL_BOTTOM, LEVEL_TOP, groundTopAt } from './layout.ts';
import type { Hazard, Platform } from './layout.ts';

// How each kind of platform and hazard is drawn, in level pixels, front parts first.
const MUSHROOM = '#7EF0E0FF';
const HOLLOW = { bark: '#5C3F52FF', dark: '#3A2638FF', groove: '#46303FFF', inside: '#1C1226FF' };

function earthParts(platform: Platform, random: SeededRandom): ArtPart[] {
    const { left, top, right, bottom } = platform;
    const pebbles: ArtPart[] = [];
    for (let x = left + 60; x < right - 40; x += random.between(110, 240)) {
        const y = top + random.between(70, 260);
        const size = random.between(6, 14);
        pebbles.push(part('Pebble', ellipsePath({ x, y }, size, size * 0.7), '#2F2245FF'));
    }

    return [
        part('Grass rim', wavyBand(left, top, right, 6, 3, 28), EARTH.grassLight),
        part('Grass', wavyBand(left, top, right, 22, 9), EARTH.grass),
        part('Grass shade', wavyBand(left, top, right, 32, 10, 44), EARTH.grassShade),
        ...pebbles,
        gradientPart(
            'Soil',
            roundedBox(left, top, right, bottom, 16),
            EARTH.soilTop,
            verticalGradient([EARTH.soilTop, EARTH.soilBottom], [0, 0.6]),
        ),
    ];
}

function plankParts(platform: Platform): ArtPart[] {
    const { left, top, right, bottom } = platform;
    const boards: ArtPart[] = [];
    let index = 0;
    for (let x = left; x < right - 8; x += 44) {
        const colour = index % 2 === 0 ? WOOD.plank : WOOD.plankDark;
        boards.push(part('Board', roundedBox(x + 2, top, Math.min(right, x + 42), bottom - 6, 4), colour));
        index++;
    }
    const posts: ArtPart[] = [];
    for (let x = left + 40; x < right; x += 200) {
        posts.push(part('Post', roundedBox(x - 11, top - 34, x + 11, LEVEL_BOTTOM, 6), WOOD.post));
    }

    return [
        ...boards,
        part('Beam', roundedBox(left, bottom - 10, right, bottom + 6, 4), WOOD.bark),
        ...posts,
        part('Rope', roundedBox(left, top - 32, right, top - 26, 3), WOOD.light),
    ];
}

function branchParts(platform: Platform, random: SeededRandom): ArtPart[] {
    const { left, top, right, bottom } = platform;
    const trunkX = left + (right - left) * 0.35;
    const leafColour = random.pick([0, 1, 4, 5]);
    const leafEnd = random.next() < 0.5 ? left - 6 : right + 6;

    return [
        part('Leaves', bumpyPath({ x: leafEnd, y: top - 4 }, 34, 24, 5, 0.18), LEAVES[leafColour] ?? EARTH.grass),
        part('Leaves', bumpyPath({ x: leafEnd + 14, y: top + 8 }, 28, 18, 4, 0.2), LEAVES_SHADE[leafColour] ?? ''),
        part('Bark top', roundedBox(left + 8, top, right - 8, top + 7, 3), WOOD.light),
        part('Branch', roundedBox(left, top, right, bottom, 13), WOOD.bark),
        part('Trunk', roundedBox(trunkX - 24, bottom - 8, trunkX + 24, LEVEL_BOTTOM, 10), '#3E2A3AFF'),
    ];
}

function logParts(platform: Platform): ArtPart[] {
    const { left, top, right, bottom } = platform;
    const radiusY = (bottom - top) / 2;
    const middleY = top + radiusY;
    const endX = right - radiusY * 0.45;

    return [
        part('Heart', ellipsePath({ x: endX, y: middleY }, radiusY * 0.16, radiusY * 0.3), WOOD.ringDark),
        part('Ring', ellipsePath({ x: endX, y: middleY }, radiusY * 0.32, radiusY * 0.62), WOOD.ring),
        part('End', ellipsePath({ x: endX, y: middleY }, radiusY * 0.45, radiusY * 0.92), WOOD.ringDark),
        part('Bark line', roundedBox(left + 18, middleY - 2, endX - 24, middleY + 2, 2), '#4B342AFF'),
        part('Moss', bumpyPath({ x: left + (right - left) * 0.4, y: top + 2 }, 26, 8, 4, 0.3), STONE.moss),
        part('Log', roundedBox(left, top, right, bottom, radiusY), WOOD.bark),
    ];
}

function stumpParts(platform: Platform): ArtPart[] {
    const { left, top, right, bottom } = platform;
    const middleX = (left + right) / 2;
    const halfWidth = (right - left) / 2;

    return [
        part('Heart', ellipsePath({ x: middleX, y: top + 10 }, halfWidth * 0.3, 3), WOOD.ringDark),
        part('Ring', ellipsePath({ x: middleX, y: top + 10 }, halfWidth * 0.65, 6.5), WOOD.ring),
        part('Top', ellipsePath({ x: middleX, y: top + 10 }, halfWidth, 10), WOOD.ringDark),
        part('Stump', roundedBox(left, top + 10, right, bottom, 6), WOOD.bark),
        part(
            'Roots',
            sharpPath([
                { x: left - 22, y: bottom },
                { x: left, y: bottom - 40 },
                { x: right, y: bottom - 40 },
                { x: right + 22, y: bottom },
            ]),
            WOOD.bark,
        ),
    ];
}

function rockParts(platform: Platform): ArtPart[] {
    const { left, top, right, bottom } = platform;
    const middleX = (left + right) / 2;
    const outline = [
        { x: left, y: bottom, sharp: true },
        { x: left + 4, y: top + (bottom - top) * 0.45 },
        { x: left + (right - left) * 0.3, y: top },
        { x: right - (right - left) * 0.25, y: top + 2 },
        { x: right, y: top + (bottom - top) * 0.5 },
        { x: right + 2, y: bottom, sharp: true },
    ];

    return [
        part('Moss', bumpyPath({ x: middleX - 6, y: top + 3 }, (right - left) * 0.3, 7, 4, 0.3), STONE.moss),
        part('Shine', turnedEllipsePath({ x: left + 26, y: top + 18 }, 14, 6, -0.4), STONE.light),
        gradientPart(
            'Rock',
            smoothClosedPath(outline),
            STONE.body,
            verticalGradient([STONE.light, STONE.body, STONE.dark]),
        ),
    ];
}

// A giant old tree: its trunk is the solid part, and the Blob runs through the hollow at its foot, low
// enough that a jump bumps its head. Glowing mushrooms light the hollow's ceiling.
function hollowTreeParts(platform: Platform, random: SeededRandom): ArtPart[] {
    const { left, right, bottom } = platform;
    const ground = groundTopAt(left - 1);
    const middle = (left + right) / 2;
    const trunk = smoothClosedPath([
        { x: left - 30, y: LEVEL_TOP, sharp: true },
        { x: right + 30, y: LEVEL_TOP, sharp: true },
        { x: right + 20, y: bottom - 200 },
        { x: right + 70, y: ground - 40 },
        { x: right + 190, y: ground + 6, sharp: true },
        { x: left - 190, y: ground + 6, sharp: true },
        { x: left - 70, y: ground - 40 },
        { x: left - 20, y: bottom - 200 },
    ]);
    const hollow = smoothClosedPath([
        { x: left + 6, y: ground + 4, sharp: true },
        { x: left + 4, y: bottom + 30 },
        { x: left + 60, y: bottom, sharp: true },
        { x: right - 60, y: bottom, sharp: true },
        { x: right - 4, y: bottom + 30 },
        { x: right - 6, y: ground + 4, sharp: true },
    ]);
    const grooves: ArtPart[] = [];
    for (let x = left - 10; x < right + 10; x += random.between(50, 90)) {
        const top = bottom - random.between(700, 1100);
        grooves.push(part('Groove', roundedBox(x - 3, top, x + 3, bottom - random.between(40, 140), 3), HOLLOW.groove));
    }
    const lights: ArtPart[] = [];
    for (const x of [left + 90, middle + 20, right - 80]) {
        const capY = bottom + 10;
        lights.push(part('Mushroom', ellipsePath({ x, y: capY }, 10, 5), MUSHROOM));
        lights.push(part('Stalk', roundedBox(x - 2, bottom, x + 2, capY, 2), '#BFF7EFFF'));
        lights.push(gradientPart('Glow', ellipsePath({ x, y: capY }, 46, 34), MUSHROOM, glow(MUSHROOM, '66')));
    }

    return [
        ...lights,
        part('Hollow', hollow, HOLLOW.inside),
        part('Moss', bumpyPath({ x: left - 110, y: ground - 8 }, 60, 14, 5, 0.3), STONE.moss),
        part('Moss', bumpyPath({ x: right + 120, y: ground - 6 }, 50, 12, 5, 0.3), STONE.moss),
        ...grooves,
        gradientPart(
            'Trunk',
            trunk,
            HOLLOW.bark,
            verticalGradient([HOLLOW.dark, HOLLOW.bark, HOLLOW.bark], [0, 0.75, 1]),
        ),
    ];
}

export function platformParts(platform: Platform, random: SeededRandom): ArtPart[] {
    switch (platform.look) {
        case 'earth':
            return earthParts(platform, random);
        case 'plank':
            return plankParts(platform);
        case 'branch':
            return branchParts(platform, random);
        case 'log':
            return logParts(platform);
        case 'stump':
            return stumpParts(platform);
        case 'rock':
            return rockParts(platform);
        case 'hollowTree':
            return hollowTreeParts(platform, random);
    }
}

function waterParts(hazard: Hazard, random: SeededRandom): ArtPart[] {
    const { left, top, right } = hazard;
    const ripples: ArtPart[] = [];
    for (let x = left + 50; x < right - 30; x += random.between(90, 160)) {
        const y = top + random.between(30, 90);
        ripples.push(part('Ripple', roundedBox(x - 22, y, x + 22, y + 3, 1.5), WATER.shine));
    }

    return [
        ...ripples,
        part('Surface', wavyBand(left, top, right, 6, 3, 24), WATER.shine),
        gradientPart(
            'Water',
            roundedBox(left, top, right, LEVEL_BOTTOM, 4),
            WATER.top,
            verticalGradient([WATER.top, WATER.bottom], [0, 0.7]),
        ),
    ];
}

function brambleParts(hazard: Hazard, random: SeededRandom): ArtPart[] {
    const { left, top, right } = hazard;
    const berries: ArtPart[] = [];
    for (let x = left + 40; x < right; x += random.between(60, 130)) {
        const y = top + random.between(10, 60);
        berries.push(part('Berry', ellipsePath({ x, y }, 6, 6), BRAMBLE.berry));
    }

    return [
        part('Front thorns', spikyTop(left, top + 70, right, LEVEL_BOTTOM, random, 40), BRAMBLE.front),
        ...berries,
        part('Thorns', spikyTop(left, top + 10, right, LEVEL_BOTTOM, random, 60), BRAMBLE.back),
        part('Back thorns', spikyTop(left, top - 20, right, LEVEL_BOTTOM, random, 50), BRAMBLE.thorn),
    ];
}

export function hazardParts(hazard: Hazard, random: SeededRandom): ArtPart[] {
    return hazard.look === 'water' ? waterParts(hazard, random) : brambleParts(hazard, random);
}
