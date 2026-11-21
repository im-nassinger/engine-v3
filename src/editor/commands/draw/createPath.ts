import { NameComponent, PathComponent, StyleComponent, TransformComponent } from '../../../core/components/index.ts';
import { Bounds } from '../../../core/geometry/index.ts';
import type { PathGeometry } from '../../../core/geometry/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { EntityId } from '../../../core/level/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import type { LevelReader } from '../../../core/level-data/index.ts';
import { AddEntitiesChange } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';
import { EntityNamer } from '../shared/EntityNamer.ts';

const LOCKED = 'This group is locked';
const TOO_DEEP = `Groups can be at most ${Level.maxDepth} deep`;

export type CreatePathOutcome =
    { readonly kind: 'created'; readonly id: EntityId } | { readonly kind: 'refused'; readonly reason: string };

// Finishing the pen's drawing: a new path with v1's default look, in the current group, on top, named
// "Path 1" and selected, in one step "Draw Path 1". The path is given in the current group's own space; its
// TransformComponent goes to the middle of the points' box and the points are kept around it, so rotating
// and resizing turn around the middle of what was drawn. Handles are measured from their point, so they
// stay as they are. Refused inside a locked group, or when the group is as deep as a level goes.
export function createPath(openLevel: OpenLevel, reader: LevelReader, path: PathGeometry): CreatePathOutcome {
    const { level, editor, currentGroup, caches } = openLevel;
    const group = currentGroup.group;
    if (caches.hidden.isLocked(group)) return { kind: 'refused', reason: LOCKED };
    if (group.depth + 1 > Level.maxDepth) return { kind: 'refused', reason: TOO_DEEP };

    const box = Bounds.around(path.points);
    if (box === undefined) throw new Error('A path to create needs points.');

    const middle = box.centre;
    const points = path.points.map((point) => ({ ...point, x: point.x - middle.x, y: point.y - middle.y }));
    const name = new EntityNamer(level).nextName('Path');
    const id = level.allocateId();
    const components = [
        new TransformComponent({ position: middle, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 }),
        new NameComponent({ name }),
        new PathComponent({ path: { closed: path.closed, points } }),
        new StyleComponent(),
    ];
    const data = new LevelWriter().writeNewEntity(id, components);
    const place = { parentId: group.id, index: 0 };

    const outcome = editor.edit(`Draw ${name}`, (transaction) => {
        transaction.apply(new AddEntitiesChange({ reader, entities: [data], place }));

        return { kind: 'done', selectAfter: [id] };
    });
    if (outcome.kind === 'refused') return outcome;

    return { kind: 'created', id };
}
