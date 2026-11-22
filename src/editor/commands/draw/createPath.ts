import { NameComponent, PathComponent, StyleComponent, TransformComponent } from '../../../core/components/index.ts';
import { Bounds } from '../../../core/geometry/index.ts';
import type { PathGeometry } from '../../../core/geometry/index.ts';
import type { LevelReader } from '../../../core/level-data/index.ts';
import type { OpenLevel } from '../../session/index.ts';

import { addDrawnEntity } from './addDrawnEntity.ts';
import type { DrawnEntityOutcome } from './addDrawnEntity.ts';

export type CreatePathOutcome = DrawnEntityOutcome;

// Finishing the pen's drawing: a new path with v1's default look, in the current group, on top, named
// "Path 1" and selected, in one step "Draw Path 1". The path is given in the current group's own space; its
// TransformComponent goes to the middle of the points' box and the points are kept around it, so rotating
// and resizing turn around the middle of what was drawn. Handles are measured from their point, so they
// stay as they are. Refused inside a locked group, or when the group is as deep as a level goes.
export function createPath(openLevel: OpenLevel, reader: LevelReader, path: PathGeometry): CreatePathOutcome {
    const box = Bounds.around(path.points);
    if (box === undefined) throw new Error('A path to create needs points.');

    const middle = box.centre;
    const points = path.points.map((point) => ({ ...point, x: point.x - middle.x, y: point.y - middle.y }));

    return addDrawnEntity(openLevel, reader, {
        word: 'Path',
        components: (name) => [
            new TransformComponent({ position: middle, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 }),
            new NameComponent({ name }),
            new PathComponent({ path: { closed: path.closed, points } }),
            new StyleComponent(),
        ],
    });
}
