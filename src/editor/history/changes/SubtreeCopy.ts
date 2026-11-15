import type { Entity, EntityId, Level } from '../../../core/entities/index.ts';
import type { EntityData, LevelReader } from '../../../core/level-data/index.ts';

import type { TreePlace } from './MoveEntityChange.ts';

export type SubtreeCopyOptions = {
    readonly reader: LevelReader;
    // As LevelWriter.writeSubtree gave them: each parent before its children.
    readonly entities: readonly EntityData[];
    // Where the first root goes; the other roots follow it in their order.
    readonly place: TreePlace;
};

// One or more subtrees as data, and the place they go: what adding and removing entities share. The data
// is cloned, so the caller's objects can change afterwards.
export class SubtreeCopy {
    private readonly reader: LevelReader;
    private readonly entities: readonly EntityData[];
    private readonly place: TreePlace;
    private readonly rootIds: readonly EntityId[];

    constructor(options: SubtreeCopyOptions) {
        this.reader = options.reader;
        this.entities = cloneEntities(options.entities);
        this.place = options.place;
        this.rootIds = rootIdsOf(this.entities);
    }

    // The command checked the data before building the change, so a refusal is a bug.
    put(level: Level) {
        const parent = level.requireEntity(this.place.parentId);

        const outcome = this.reader.readSubtree(level, this.entities, parent, this.place.index);
        if (!outcome.ok) {
            throw new Error(`The entities could not be put into ${parent.id}: ${JSON.stringify(outcome.refusal)}.`);
        }
    }

    take(level: Level) {
        for (const rootId of this.rootIds) {
            const root = level.requireEntity(rootId);
            level.removeEntity(root);
        }
    }
}

// EntityData is plain JSON, so a trip through JSON text copies every nested value.
function cloneEntities(entities: readonly EntityData[]) {
    const text = JSON.stringify(entities);

    return JSON.parse(text) as readonly EntityData[];
}

// The same roots LevelReader.readSubtree finds: each entity whose parent isn't listed before it.
function rootIdsOf(entities: readonly EntityData[]) {
    const listed = new Set<EntityId>();
    const rootIds: EntityId[] = [];

    for (const entity of entities) {
        const isRoot = entity.parent === null || !listed.has(entity.parent);
        if (isRoot) {
            rootIds.push(entity.id);
        }

        listed.add(entity.id);
    }

    return rootIds;
}

// Where an entity sits now, to put it back in the same place.
export function placeOf(entity: Entity): TreePlace {
    const parent = entity.parent;
    if (parent === undefined) {
        throw new Error('The World has no place in a parent.');
    }

    return { parentId: parent.id, index: parent.children.indexOf(entity) };
}
