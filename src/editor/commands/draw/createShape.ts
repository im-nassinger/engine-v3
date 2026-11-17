import { NameComponent, ShapeComponent, StyleComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Point, ShapeGeometry, ShapeKind } from '../../../core/geometry/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { EntityId } from '../../../core/level/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import type { LevelReader } from '../../../core/level-data/index.ts';
import { AddEntitiesChange } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';
import { EntityNamer } from '../shared/EntityNamer.ts';

const LOCKED = 'This group is locked';
const TOO_DEEP = `Groups can be at most ${Level.maxDepth} deep`;

const KIND_WORDS: Readonly<Record<ShapeKind, string>> = {
    rectangle: 'Rectangle',
    circle: 'Circle',
    polygon: 'Polygon',
    line: 'Line',
};

// What the Shape tool drew, in the current group's own space: the shape's geometry around its own
// origin, where that origin goes, and how far Z and X turned it, in degrees clockwise.
export type ShapeDrawing = {
    readonly geometry: ShapeGeometry;
    readonly position: Point;
    readonly rotation: number;
};

export type CreateShapeOutcome =
    { readonly kind: 'created'; readonly id: EntityId } | { readonly kind: 'refused'; readonly reason: string };

// Finishing a drawing: a new shape with v1's default look, in the current group, on top, named
// "Rectangle 1" and selected, in one step "Draw Rectangle 1", at the drawing's rotation. An edit, not a registered command, since
// only the Shape tool runs it. Refused inside a locked group, or when the group is as deep as a level goes.
export function createShape(openLevel: OpenLevel, reader: LevelReader, drawing: ShapeDrawing): CreateShapeOutcome {
    const { level, editor, currentGroup, caches } = openLevel;
    const group = currentGroup.group;
    if (caches.hidden.isLocked(group)) return { kind: 'refused', reason: LOCKED };
    if (group.depth + 1 > Level.maxDepth) return { kind: 'refused', reason: TOO_DEEP };

    const name = new EntityNamer(level).nextName(KIND_WORDS[drawing.geometry.kind]);
    const id = level.allocateId();
    const components = [
        new TransformComponent({
            position: drawing.position,
            rotation: drawing.rotation,
            scale: { x: 1, y: 1 },
            skew: 0,
        }),
        new NameComponent({ name }),
        new ShapeComponent({ geometry: drawing.geometry }),
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
