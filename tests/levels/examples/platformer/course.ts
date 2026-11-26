import { TagsComponent, TransformComponent } from '../../../../src/core/components/index.ts';
import type { PathGeometry, PathPoint } from '../../../../src/core/geometry/index.ts';
import type { Entity, Level } from '../../../../src/core/level/index.ts';
import { addEntity, addSurface, at, rectangle } from '../../determinism/build/levelParts.ts';

import { addArtPath, part } from './art/artEntities.ts';
import { GROUND_TAG } from './controller/blobController.ts';

// The course, left to right, one stretch per mechanic. Each platform is its edges in level pixels: y
// grows downwards and the level's bottom edge is at 1200.
export type Platform = {
    readonly name: string;
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly look: 'ground' | 'pink' | 'yellow' | 'purple';
};

const LEVEL_BOTTOM = 1200;

export const START = { x: -4200, y: 400 };
export const GOAL = { x: 4200, y: 240 };

export const PLATFORMS: readonly Platform[] = [
    // Flat ground to try walking, stopping and turning.
    { name: 'Start ground', left: -4500, top: 400, right: -3200, bottom: LEVEL_BOTTOM, look: 'ground' },
    { name: 'Step', left: -3200, top: 280, right: -2700, bottom: LEVEL_BOTTOM, look: 'ground' },
    // A wide gap: jump late off the edge and coyote time still lets you jump. Fall in and climb out.
    { name: 'Pit floor', left: -2700, top: 640, right: -2340, bottom: LEVEL_BOTTOM, look: 'ground' },
    { name: 'Pit step', left: -2580, top: 470, right: -2460, bottom: 504, look: 'yellow' },
    { name: 'Past the gap', left: -2340, top: 280, right: -1700, bottom: LEVEL_BOTTOM, look: 'ground' },
    // A ledge only a jump held to the top reaches, under a low ceiling whose corners the blob slides past.
    { name: 'High ledge', left: -1700, top: 30, right: -1050, bottom: LEVEL_BOTTOM, look: 'ground' },
    { name: 'Low ceiling', left: -1500, top: -420, right: -1180, bottom: -130, look: 'purple' },
    // A long drop: the fall speed stops growing at its limit.
    { name: 'Drop floor', left: -1050, top: 1000, right: 400, bottom: LEVEL_BOTTOM, look: 'ground' },
    // Steps back up, each a held jump apart.
    { name: 'Stair 1', left: -820, top: 830, right: -620, bottom: 864, look: 'pink' },
    { name: 'Stair 2', left: -540, top: 670, right: -340, bottom: 704, look: 'yellow' },
    { name: 'Stair 3', left: -260, top: 510, right: -60, bottom: 544, look: 'purple' },
    { name: 'Stair 4', left: 20, top: 360, right: 220, bottom: 394, look: 'pink' },
    // A long plateau: hurdles, floating platforms, then a low tunnel where only short hops fit.
    { name: 'Plateau', left: 400, top: 240, right: 4500, bottom: LEVEL_BOTTOM, look: 'ground' },
    { name: 'Hurdle', left: 1200, top: 170, right: 1290, bottom: 240, look: 'purple' },
    { name: 'Tall hurdle', left: 1750, top: 100, right: 1850, bottom: 240, look: 'yellow' },
    { name: 'Floating 1', left: 2250, top: 70, right: 2500, bottom: 104, look: 'pink' },
    { name: 'Floating 2', left: 2650, top: -90, right: 2900, bottom: -56, look: 'yellow' },
    { name: 'Floating 3', left: 3050, top: 70, right: 3300, bottom: 104, look: 'purple' },
    { name: 'Tunnel roof', left: 3500, top: -300, right: 3900, bottom: 100, look: 'purple' },
    { name: 'Tunnel bump', left: 3670, top: 200, right: 3730, bottom: 240, look: 'yellow' },
];

const LOOKS = {
    ground: { body: '#F4CFA4FF', top: '#7FD69EFF' },
    pink: { body: '#FF9BB8FF', top: '#FFB9CDFF' },
    yellow: { body: '#FFD45CFF', top: '#FFE38FFF' },
    purple: { body: '#B48CF2FF', top: '#C9AAF7FF' },
};
const CORNER_RADIUS = 18;
const TOP_LAYER = 26;
// The share of a corner's radius a curve handle takes for a quarter circle.
const QUARTER_CIRCLE_HANDLE = 0.552;

function point(x: number, y: number, handleX: number, handleY: number): PathPoint {
    return { x, y, handleIn: { x: -handleX, y: -handleY }, handleOut: { x: handleX, y: handleY }, corner: 'smooth' };
}

// A rectangle with round corners round (0, 0): each straight edge keeps its handles on its own line.
export function roundedRectanglePath(width: number, height: number, radius: number): PathGeometry {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const corner = Math.min(radius, halfWidth, halfHeight);
    const handle = corner * QUARTER_CIRCLE_HANDLE;

    return {
        closed: true,
        points: [
            point(-halfWidth + corner, -halfHeight, handle, 0),
            point(halfWidth - corner, -halfHeight, handle, 0),
            point(halfWidth, -halfHeight + corner, 0, handle),
            point(halfWidth, halfHeight - corner, 0, handle),
            point(halfWidth - corner, halfHeight, -handle, 0),
            point(-halfWidth + corner, halfHeight, -handle, 0),
            point(-halfWidth, halfHeight - corner, 0, -handle),
            point(-halfWidth, -halfHeight + corner, 0, -handle),
        ],
    };
}

// A static platform: its solid rectangle, tagged ground, and its drawing, a body and a lighter top.
function addPlatform(level: Level, parent: Entity, platform: Platform) {
    const width = platform.right - platform.left;
    const height = platform.bottom - platform.top;
    const centreX = platform.left + width / 2;
    const centreY = platform.top + height / 2;
    const look = LOOKS[platform.look];

    const entity = addEntity(level, parent, platform.name, at(centreX, centreY));
    addSurface(entity, rectangle(width, height), { friction: 0.8, restitution: 0 });
    entity.addComponent(new TagsComponent({ tags: [GROUND_TAG] }));

    const topHeight = Math.min(TOP_LAYER, height / 2);
    const topPath = roundedRectanglePath(width, topHeight, CORNER_RADIUS);
    const topOffset = -height / 2 + topHeight / 2;
    const top = addArtPath(level, entity, part('Top', topPath, look.top));
    top.requireComponent(TransformComponent).set('position', { x: 0, y: topOffset });

    const bodyPath = roundedRectanglePath(width, height, CORNER_RADIUS);
    addArtPath(level, entity, part('Body', bodyPath, look.body));

    return entity;
}

export function addCourse(level: Level) {
    const course = addEntity(level, level.world, 'Course');
    for (const platform of PLATFORMS) {
        addPlatform(level, course, platform);
    }

    return course;
}
