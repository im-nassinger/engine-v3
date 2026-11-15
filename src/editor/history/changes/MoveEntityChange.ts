import { TransformComponent } from '../../../core/components/index.ts';
import type { EntityId, Level } from '../../../core/entities/index.ts';
import type { TransformValues } from '../../../core/geometry/index.ts';

import type { LevelChange } from './LevelChange.ts';
import { writeKnownValue } from './writeKnownValue.ts';

// Where an entity sits in the tree: its parent and its index among the siblings once it has moved.
export type TreePlace = {
    readonly parentId: EntityId;
    readonly index: number;
};

export type MoveEntityChangeOptions = {
    readonly entityId: EntityId;
    readonly oldPlace: TreePlace;
    readonly newPlace: TreePlace;
    // Kept apart from the place, because moving into another group changes them to keep the entity in place on screen.
    readonly oldTransform: TransformValues;
    readonly newTransform: TransformValues;
};

type MoveTarget = {
    readonly place: TreePlace;
    readonly transform: TransformValues;
};

// Reorder, move into a group, group and ungroup. The level's own checks ran when the command built it,
// so a refused move is a bug and throws.
export class MoveEntityChange implements LevelChange {
    readonly entityId: EntityId;
    private readonly oldTarget: MoveTarget;
    private readonly newTarget: MoveTarget;

    constructor(options: MoveEntityChangeOptions) {
        this.entityId = options.entityId;
        this.oldTarget = { place: options.oldPlace, transform: cloneTransform(options.oldTransform) };
        this.newTarget = { place: options.newPlace, transform: cloneTransform(options.newTransform) };
    }

    apply(level: Level) {
        this.moveTo(level, this.newTarget);
    }

    revert(level: Level) {
        this.moveTo(level, this.oldTarget);
    }

    private moveTo(level: Level, target: MoveTarget) {
        const entity = level.requireEntity(this.entityId);
        const parent = level.requireEntity(target.place.parentId);

        const outcome = level.moveEntity(entity, parent, target.place.index);
        if (!outcome.moved) {
            throw new Error(`Entity ${this.entityId} could not move into ${parent.id}: ${outcome.reason}.`);
        }

        const transform = entity.requireComponent(TransformComponent);
        for (const entry of TransformComponent.schema.entries) {
            const value = target.transform[entry.key];
            writeKnownValue(transform, entry, value);
        }
    }
}

function cloneTransform(values: TransformValues): TransformValues {
    return {
        position: { x: values.position.x, y: values.position.y },
        rotation: values.rotation,
        scale: { x: values.scale.x, y: values.scale.y },
        skew: values.skew,
    };
}
