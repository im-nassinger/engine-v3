import { TagsComponent } from '../../../../../src/core/components/index.ts';
import type { Entity, Level } from '../../../../../src/core/level/index.ts';
import { addEntity, addShape, addSurface, at, rectangle } from '../../../determinism/build/levelParts.ts';
import { giveTriggers } from '../../../determinism/build/triggerParts.ts';

import { addArtPath } from '../../platformer/art/artEntities.ts';
import type { ArtPart } from '../../platformer/art/blobArt.ts';
import { GROUND_TAG, PLAYER_TAG } from '../../platformer/controller/blobController.ts';
import { otherHasTag } from '../../platformer/controller/triggerBlocks.ts';
import { SeededRandom } from '../art/random.ts';
import { movedPath } from '../art/shapes.ts';
import { HAZARDS, LEVEL_BOTTOM, PLATFORMS } from './layout.ts';
import type { Hazard, Platform } from './layout.ts';
import { hazardParts, platformParts } from './platformArt.ts';

// The water's touch starts this far below its surface, so a foot dipped while jumping off a bank is spared.
const WATER_GRACE = 18;
const BRAMBLE_GRACE = 40;

// Art drawn in level pixels, placed in an entity sitting at `centre`.
function addPartsAround(level: Level, entity: Entity, parts: readonly ArtPart[], centreX: number, centreY: number) {
    for (const artPart of parts) {
        addArtPath(level, entity, { ...artPart, path: movedPath(artPart.path, { x: -centreX, y: -centreY }) });
    }
}

// A static platform: its solid rectangle, tagged ground, with its drawing.
function addPlatform(level: Level, parent: Entity, platform: Platform, random: SeededRandom) {
    const width = platform.right - platform.left;
    const height = platform.bottom - platform.top;
    const centreX = platform.left + width / 2;
    const centreY = platform.top + height / 2;

    const entity = addEntity(level, parent, platform.name, at(centreX, centreY));
    addSurface(entity, rectangle(width, height), { friction: 0.8, restitution: 0 });
    entity.addComponent(new TagsComponent({ tags: [GROUND_TAG] }));
    addPartsAround(level, entity, platformParts(platform, random), centreX, centreY);
}

// Water or brambles: drawn, and a pass-through shape under the surface that loses the run when the Blob
// touches it.
function addHazard(level: Level, parent: Entity, hazard: Hazard, random: SeededRandom) {
    const grace = hazard.look === 'water' ? WATER_GRACE : BRAMBLE_GRACE;
    const top = hazard.top + grace;
    const width = hazard.right - hazard.left;
    const height = LEVEL_BOTTOM - top;
    const centreX = hazard.left + width / 2;
    const centreY = top + height / 2;

    const entity = addEntity(level, parent, hazard.name, at(centreX, centreY));
    addShape(entity, rectangle(width, height));
    giveTriggers(entity, [
        { when: { kind: 'touched' }, checks: [otherHasTag(PLAYER_TAG)], actions: [{ kind: 'lose' }] },
    ]);
    addPartsAround(level, entity, hazardParts(hazard, random), centreX, centreY);
}

export function addHazards(level: Level) {
    const random = new SeededRandom(7);
    const hazards = addEntity(level, level.world, 'Hazards');
    for (const hazard of HAZARDS) {
        addHazard(level, hazards, hazard, random);
    }
}

export function addCourse(level: Level) {
    const random = new SeededRandom(11);
    const course = addEntity(level, level.world, 'Course');
    for (const platform of PLATFORMS) {
        addPlatform(level, course, platform, random);
    }
}
