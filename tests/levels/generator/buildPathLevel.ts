import {
    NameComponent,
    PathComponent,
    StyleComponent,
    TransformComponent,
} from '../../../src/core/components/index.ts';
import type { PathPoint, Point } from '../../../src/core/geometry/index.ts';
import type { Entity } from '../../../src/core/level/index.ts';

import { buildTestLevel } from './buildTestLevel.ts';
import type { TestLevel } from './buildTestLevel.ts';

// A wavy ring in the middle of the test level's grid, inside its World rectangle at 10,000 entities.
const RING_RADIUS = 3_000;
const WAVE_HEIGHT = 150;
const WAVES = 40;
const PATH_COLOUR = '#3C8CC8FF';

export type PathTestLevel = TestLevel & {
    readonly path: Entity;
};

// The speed tests' level for paths: buildTestLevel's grid with one closed path of pointCount smooth points
// in front of it, so entityCount counts the path too. The path is a ring with 40 waves, each point's
// handles along the line between its neighbours, so every segment is a curve.
export function buildPathLevel(entityCount: number, pointCount: number): PathTestLevel {
    if (!Number.isInteger(entityCount) || entityCount < 1) {
        throw new Error(`A path test level holds the path and a whole number of entities, not ${entityCount}.`);
    }

    const built = buildTestLevel(entityCount - 1);
    const path = built.level.createEntity(built.level.world, 0);
    path.addComponent(new TransformComponent());
    path.addComponent(new NameComponent({ name: 'Path 1' }));
    path.addComponent(new PathComponent({ path: { closed: true, points: wavyRing(pointCount) } }));
    path.addComponent(
        new StyleComponent({ ...StyleComponent.schema.defaults(), fill: { kind: 'solid', colour: PATH_COLOUR } }),
    );

    return { ...built, path };
}

function wavyRing(pointCount: number): PathPoint[] {
    const places = Array.from({ length: pointCount }, (_, index) => ringPlace(index / pointCount));

    return places.map((place, index) => {
        const before = places[(index + pointCount - 1) % pointCount] ?? place;
        const after = places[(index + 1) % pointCount] ?? place;
        // A sixth of the way between the neighbours, as a Catmull-Rom curve, so the path stays smooth.
        const handle = { x: (after.x - before.x) / 6, y: (after.y - before.y) / 6 };

        return {
            x: place.x,
            y: place.y,
            handleIn: { x: -handle.x, y: -handle.y },
            handleOut: handle,
            corner: 'smooth',
        };
    });
}

function ringPlace(share: number): Point {
    const angle = share * 2 * Math.PI;
    const radius = RING_RADIUS + WAVE_HEIGHT * Math.sin(WAVES * angle);

    return { x: Math.round(radius * Math.cos(angle) * 100) / 100, y: Math.round(radius * Math.sin(angle) * 100) / 100 };
}
