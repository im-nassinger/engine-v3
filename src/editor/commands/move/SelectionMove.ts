import { TransformComponent } from '../../../core/components/index.ts';
import { Bounds } from '../../../core/geometry/index.ts';
import type { Matrix2D, Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { ValueTarget } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';
import { stepLabel } from '../shared/stepLabel.ts';

// One moved entity: where its origin was in the level, and its parent's level matrix turned around,
// both read before anything moved. Its parent never moves, because the selection never holds both.
type MovedEntity = {
    readonly entity: Entity;
    readonly target: ValueTarget;
    readonly startOrigin: Point;
    readonly parentInverse: Matrix2D;
};

// The answer when nothing in the selection can move, with the reason to show.
export type NoMove = { readonly kind: 'refused'; readonly reason: string };

// The code a drag and a nudge share: the selection moved by an offset in level positions, whatever the
// rotation, scale and skew of each entity's parents. The World and locked entities never move; a locked
// child still moves with its parent. Each position goes through LiveEdit, which the caller begins first.
export class SelectionMove {
    readonly label: string;
    // The moved entities' bounds at the start, outlines left out, for snapping their edges and centre.
    readonly startBounds: Bounds;
    private readonly openLevel: OpenLevel;
    private readonly moved: readonly MovedEntity[];

    private constructor(openLevel: OpenLevel, moved: readonly MovedEntity[], startBounds: Bounds) {
        this.openLevel = openLevel;
        this.moved = moved;
        this.startBounds = startBounds;
        this.label = stepLabel(
            'Move',
            moved.map((each) => each.entity),
        );
    }

    static ofSelection(openLevel: OpenLevel): SelectionMove | NoMove {
        const { level, selection, caches } = openLevel;
        if (selection.isEmpty) return { kind: 'refused', reason: 'Nothing selected' };

        const movable = selection.entities.filter((entity) => entity !== level.world && !entity.isLocked);
        const moved = movable.flatMap((entity) => movedEntityOf(openLevel, entity));
        if (moved.length === 0) return { kind: 'refused', reason: refusalReason(openLevel) };

        const entities = moved.map((each) => each.entity);
        const edgeBounds = entities.map((entity) => caches.bounds.subtreeEdgesOf(entity));
        const origins = moved.map((each) => each.startOrigin);
        const startBounds = unionOf(edgeBounds) ?? Bounds.around(origins);
        if (startBounds === undefined) throw new Error('A move with entities has their origins.');

        return new SelectionMove(openLevel, moved, startBounds);
    }

    get targets(): readonly ValueTarget[] {
        return this.moved.map((each) => each.target);
    }

    // Writes every position so each origin is the offset away from where it started on screen.
    moveBy(offset: Point) {
        const { liveEdit } = this.openLevel;

        for (const { target, startOrigin, parentInverse } of this.moved) {
            const origin = { x: startOrigin.x + offset.x, y: startOrigin.y + offset.y };
            liveEdit.update(target, parentInverse.apply(origin));
        }
    }
}

// An entity under a parent with a scale of 0 has nowhere to move to, and is left out.
function movedEntityOf(openLevel: OpenLevel, entity: Entity): MovedEntity[] {
    const parent = entity.parent;
    if (parent === undefined) return [];

    const { worldMatrices } = openLevel.caches;
    const parentInverse = worldMatrices.matrixOf(parent).invert();
    if (parentInverse === undefined) return [];

    const levelMatrix = worldMatrices.matrixOf(entity);
    const startOrigin = levelMatrix.apply({ x: 0, y: 0 });
    const target = { entityId: entity.id, schema: TransformComponent.schema, key: 'position' };

    return [{ entity, target, startOrigin, parentInverse }];
}

function refusalReason(openLevel: OpenLevel) {
    const { level, selection } = openLevel;
    const onlyWorld = selection.entities.every((entity) => entity === level.world);
    if (onlyWorld) return "The World can't be moved";

    const allLocked = selection.entities.every((entity) => entity.isLocked);
    if (allLocked) return "Locked entities don't move";

    return 'Nothing here can move';
}

function unionOf(boundsList: readonly (Bounds | undefined)[]) {
    let union: Bounds | undefined;
    for (const bounds of boundsList) {
        if (bounds === undefined) continue;

        union = union === undefined ? bounds : union.union(bounds);
    }

    return union;
}
