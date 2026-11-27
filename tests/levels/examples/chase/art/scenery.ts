import type { Point } from '../../../../../src/core/geometry/index.ts';
import type { Entity, Level } from '../../../../../src/core/level/index.ts';
import { addEntity } from '../../../determinism/build/levelParts.ts';

import { addArtPath, glow, gradientPart, part } from '../../platformer/art/artEntities.ts';
import type { ArtPart } from '../../platformer/art/blobArt.ts';
import { ellipsePath, smoothClosedPath } from '../../platformer/art/pathShapes.ts';
import { HAZARDS, HOME, LEVEL_BOTTOM, LEVEL_LEFT, LEVEL_RIGHT, PLATFORMS, groundTopAt } from '../course/layout.ts';
import { FIREFLY, HAZE, STAR, STAR_DIM, TUFT, TUFT_LIT } from './palette.ts';
import { SeededRandom } from './random.ts';
import { bumpyPath, roundedBox, starPath, tuftPath } from './shapes.ts';
import { nearTree } from './trees.ts';

// Everything behind and around the course that doesn't collide, built back to front in layers, each a
// group in the Entities viewer. Drawn in level pixels.

const SUN = { x: 5500, y: 40 };
const HOME_CLEARING = 380;

function addParts(level: Level, parent: Entity, parts: readonly ArtPart[]) {
    for (const artPart of parts) {
        addArtPath(level, parent, artPart);
    }
}

function isOverHazard(x: number, margin: number) {
    return HAZARDS.some((hazard) => x > hazard.left - margin && x < hazard.right + margin);
}

// Each stretch of earth the Blob runs on, as left and right.
function earthStretches() {
    return PLATFORMS.filter((platform) => platform.look === 'earth');
}

function stars(random: SeededRandom): ArtPart[] {
    const parts: ArtPart[] = [];
    for (let i = 0; i < 150; i++) {
        const x = random.between(LEVEL_LEFT, LEVEL_RIGHT);
        const y = random.between(-1180, -120);
        const bright = random.next() < 0.12;
        if (bright) {
            parts.push(part('Star', starPath({ x, y }, random.between(6, 10)), STAR));
        } else {
            const size = random.between(1.4, 3);
            parts.push(part('Star', ellipsePath({ x, y }, size, size), random.next() < 0.5 ? STAR : STAR_DIM));
        }
    }

    return parts;
}

// The sun setting behind the hut: the level's last sight.
function sun(): ArtPart[] {
    return [
        part('Sun', ellipsePath(SUN, 150, 150), '#FFE2A8FF'),
        gradientPart('Sun glow', ellipsePath(SUN, 520, 420), '#FFB070FF', glow('#FFB070FF', 'A0')),
    ];
}

function hills(random: SeededRandom): ArtPart[] {
    const parts: ArtPart[] = [];
    for (let x = LEVEL_LEFT + 300; x < LEVEL_RIGHT - 300; x += random.between(500, 900)) {
        const width = Math.min(random.between(900, 1500), (x - LEVEL_LEFT) * 2, (LEVEL_RIGHT - x) * 2);
        const top = random.between(-60, 160);
        const outline = [
            { x: x - width / 2, y: LEVEL_BOTTOM, sharp: true },
            { x: x - width * 0.32, y: top + (LEVEL_BOTTOM - top) * 0.12 },
            { x, y: top },
            { x: x + width * 0.32, y: top + (LEVEL_BOTTOM - top) * 0.1 },
            { x: x + width / 2, y: LEVEL_BOTTOM, sharp: true },
        ];
        parts.push(part('Hill', smoothClosedPath(outline), HAZE.hills));
    }

    return parts;
}

// A tree of the purple forest: a tall straight trunk, a round lumpy crown, sometimes a branch arching out
// to a smaller crown.
function forestTree(x: number, crownY: number, width: number, colour: string, random: SeededRandom): ArtPart[] {
    const crownRadius = width * random.between(2.2, 3.2);
    const parts: ArtPart[] = [
        part('Crown', bumpyPath({ x, y: crownY }, crownRadius, crownRadius * 0.62, 7, 0.16), colour),
        part('Trunk', roundedBox(x - width / 2, crownY, x + width / 2, LEVEL_BOTTOM, width / 3), colour),
    ];
    if (random.next() < 0.55) {
        const side = random.next() < 0.5 ? -1 : 1;
        const startY = crownY + random.between(160, 320);
        const end = { x: x + side * random.between(90, 150), y: startY - random.between(90, 150) };
        const thickness = width * 0.28;
        const branch = smoothClosedPath([
            { x: x, y: startY + thickness, sharp: true },
            { x: x + (end.x - x) * 0.55, y: startY - 10 },
            { x: end.x, y: end.y, sharp: true },
            { x: end.x + side * thickness, y: end.y + 4, sharp: true },
            { x: x + (end.x - x) * 0.62, y: startY + thickness - 6 },
            { x: x, y: startY + thickness * 2.4, sharp: true },
        ]);
        parts.unshift(part('Small crown', bumpyPath(end, crownRadius * 0.45, crownRadius * 0.3, 5, 0.2), colour));
        parts.push(part('Branch', branch, colour));
    }

    return parts;
}

function forest(
    random: SeededRandom,
    colour: string,
    spacing: [number, number],
    width: [number, number],
    crown: [number, number],
) {
    const parts: ArtPart[] = [];
    for (let x = LEVEL_LEFT + 220; x < LEVEL_RIGHT - 220; x += random.between(...spacing)) {
        parts.push(...forestTree(x, random.between(...crown), random.between(...width), colour, random));
    }

    return parts;
}

// Round bushes along the back of every stretch of earth.
function bushes(random: SeededRandom): ArtPart[] {
    const parts: ArtPart[] = [];
    for (const stretch of earthStretches()) {
        for (let x = stretch.left + 40; x < stretch.right - 40; x += random.between(110, 220)) {
            if (Math.abs(x - HOME.x) < HOME_CLEARING) continue;
            const radius = random.between(50, 110);
            const centre = { x, y: stretch.top + 10 - radius * 0.35 };
            parts.push(part('Bush', bumpyPath(centre, radius, radius * 0.7, 6, 0.2), HAZE.nearBushes));
        }
    }

    return parts;
}

function nearTrees(random: SeededRandom): ArtPart[] {
    const parts: ArtPart[] = [];
    for (const stretch of earthStretches()) {
        for (let x = stretch.left + 80; x < stretch.right - 60; x += random.between(260, 520)) {
            if (Math.abs(x - HOME.x) < HOME_CLEARING) continue;
            const base = { x, y: groundTopAt(x) + 8 };
            parts.push(...nearTree(base, random.between(190, 360), random));
        }
    }

    return parts;
}

function fireflies(random: SeededRandom): ArtPart[] {
    const parts: ArtPart[] = [];
    for (let i = 0; i < 70; i++) {
        const x = random.between(LEVEL_LEFT + 200, LEVEL_RIGHT - 200);
        const ground = Math.min(groundTopAt(x), 600);
        const centre: Point = { x, y: ground - random.between(60, 380) };
        parts.push(part('Firefly', ellipsePath(centre, 2.6, 2.6), '#FFF6D0FF'));
        parts.push(gradientPart('Firefly glow', ellipsePath(centre, 16, 16), FIREFLY, glow(FIREFLY, 'C0')));
    }

    return parts;
}

// Tufts of leaves on the grass, dark against the soil's lit edge.
function tufts(random: SeededRandom): ArtPart[] {
    const parts: ArtPart[] = [];
    for (const stretch of earthStretches()) {
        for (let x = stretch.left + 30; x < stretch.right - 30; x += random.between(90, 260)) {
            if (isOverHazard(x, 20)) continue;
            const base = { x, y: groundTopAt(x) + 6 };
            const colour = random.next() < 0.5 ? TUFT : TUFT_LIT;
            parts.push(part('Tuft', tuftPath(base, random.between(18, 34), 5), colour));
        }
    }

    return parts;
}

function addLayer(level: Level, parent: Entity, name: string, parts: readonly ArtPart[]) {
    const layer = addEntity(level, parent, name);
    addParts(level, layer, parts);
}

// The tufts sit on the course's front edge, so they are built before it; the rest goes behind.
export function addTufts(level: Level) {
    addLayer(level, level.world, 'Tufts', tufts(new SeededRandom(3)));
}

export function addScenery(level: Level) {
    const random = new SeededRandom(2026);
    const scenery = addEntity(level, level.world, 'Scenery');
    addLayer(level, scenery, 'Near trees', nearTrees(random));
    addLayer(level, scenery, 'Bushes', bushes(random));
    addLayer(level, scenery, 'Fireflies', fireflies(random));
    addLayer(level, scenery, 'Forest', forest(random, HAZE.midTrees, [260, 460], [44, 70], [-420, -160]));
    addLayer(level, scenery, 'Sun', sun());
    addLayer(level, scenery, 'Far forest', forest(random, HAZE.farTrees, [180, 320], [26, 42], [-300, -40]));
    addLayer(level, scenery, 'Hills', hills(random));
    addLayer(level, scenery, 'Stars', stars(random));
}
