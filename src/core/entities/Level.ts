import { NameComponent, TransformComponent } from '../components/index.ts';
import type { EntityId } from '../fields/index.ts';

import { Entity } from './Entity.ts';
import type { EntityChange } from './EntityChange.ts';
import { EntityIdAllocator } from './EntityIdAllocator.ts';
import { LevelSignals } from './LevelSignals.ts';
import { LevelTree } from './LevelTree.ts';
import type { LevelUpdate } from './LevelUpdate.ts';
import type { MoveOutcome } from './MoveOutcome.ts';
import type { RenameOutcome } from './RenameOutcome.ts';

// Counted in parents above an entity: an entity directly inside the World is 1 deep.
const MAX_DEPTH = 256;
const MAX_NAME_LENGTH = 60;
const NEW_LEVEL_NAME = 'Untitled level';

type ListenedEntity = {
    readonly entity: Entity;
    readonly unsubscribe: () => void;
};

// Owns the tree: which entity sits in which parent, in which order. Changes only the tree.
export class Level {
    readonly world: Entity;
    readonly camera: Entity;
    readonly signals = new LevelSignals();
    private readonly tree = new LevelTree<Entity>();
    private readonly listenedById = new Map<EntityId, ListenedEntity>();
    private readonly idAllocator = new EntityIdAllocator();
    private levelName = NEW_LEVEL_NAME;

    private constructor() {
        const worldId = this.idAllocator.next();
        this.world = new Entity(worldId, this.tree);
        this.tree.addRoot(this.world);
        this.listenTo(this.world);

        const cameraId = this.idAllocator.next();
        this.camera = this.attach(cameraId, this.world, 0);
    }

    // The World is id 1 and the camera id 2. Their other components come with stage 2, and the registry with them.
    static createNew() {
        const level = new Level();

        level.world.addComponent(new TransformComponent());
        level.world.addComponent(new NameComponent({ name: 'World' }));
        level.camera.addComponent(new TransformComponent());
        level.camera.addComponent(new NameComponent({ name: 'Camera' }));

        return level;
    }

    get name() {
        return this.levelName;
    }

    rename(name: string): RenameOutcome {
        const trimmedName = name.trim();
        const characterCount = Array.from(trimmedName).length;

        if (characterCount === 0) return { renamed: false, reason: 'empty' };
        if (characterCount > MAX_NAME_LENGTH) return { renamed: false, reason: 'tooLong' };
        if (trimmedName === this.levelName) return { renamed: true, name: trimmedName };

        this.levelName = trimmedName;
        this.announceLevelRenamed();

        return { renamed: true, name: trimmedName };
    }

    get entityCount() {
        return this.listenedById.size;
    }

    findEntity(id: EntityId) {
        const listened = this.listenedById.get(id);

        return listened?.entity;
    }

    requireEntity(id: EntityId) {
        const entity = this.findEntity(id);
        if (entity === undefined) {
            throw new Error(`No entity has id ${id}.`);
        }

        return entity;
    }

    // A new entity with a new id.
    createEntity(parent: Entity, index: number) {
        const id = this.idAllocator.next();

        return this.addEntity(id, parent, index);
    }

    // An entity with a known id: undo of a delete, or loading.
    restoreEntity(id: EntityId, parent: Entity, index: number) {
        if (this.listenedById.has(id)) {
            throw new Error(`Entity ${id} is already in the level.`);
        }

        this.idAllocator.reserve(id);

        return this.addEntity(id, parent, index);
    }

    // Index is the entity's position among its new siblings once it has moved.
    moveEntity(entity: Entity, newParent: Entity, index: number): MoveOutcome {
        this.requireInLevel(entity);
        this.requireInLevel(newParent);

        if (entity === this.world) return { moved: false, reason: 'world' };

        const isCamera = entity === this.camera;
        if (isCamera && newParent !== this.world) return { moved: false, reason: 'cameraOutsideWorld' };

        const wouldMakeCycle = entity === newParent || entity.isAncestorOf(newParent);
        if (wouldMakeCycle) return { moved: false, reason: 'cycle' };

        const deepestAfterMove = newParent.depth + 1 + this.tree.heightBelow(entity);
        if (deepestAfterMove > MAX_DEPTH) return { moved: false, reason: 'tooDeep' };

        const formerParent = this.requireParent(entity);
        this.tree.move(entity, newParent, index);
        this.announceTreeChange({ kind: 'entityMoved', entity, formerParent }, [entity, formerParent, newParent]);

        return { moved: true };
    }

    // Removes the entity and everything inside it, children first.
    removeEntity(entity: Entity) {
        this.requireInLevel(entity);

        const isProtected = entity === this.world || entity === this.camera;
        if (isProtected) {
            throw new Error('The World and the camera are never removed.');
        }

        for (const removed of this.tree.postOrder(entity)) {
            this.removeOne(removed);
        }
    }

    // Parents before their children, top row first: the run order.
    entitiesInPanelOrder() {
        return this.tree.preOrder(this.world);
    }

    // Back to front. The World comes first, because its fill is the background. The rest is the panel
    // order backwards, so the top row is drawn last, in front.
    entitiesInDrawOrder() {
        const panelOrder = [...this.tree.preOrder(this.world)];
        const everythingButTheWorld = panelOrder.slice(1);
        const backToFront = everythingButTheWorld.reverse();

        return [this.world, ...backToFront];
    }

    private addEntity(id: EntityId, parent: Entity, index: number) {
        this.requireInLevel(parent);

        const isTooDeep = parent.depth + 1 > MAX_DEPTH;
        if (isTooDeep) {
            throw new Error(`An entity can't be more than ${MAX_DEPTH} deep.`);
        }

        const entity = this.attach(id, parent, index);
        this.announceTreeChange({ kind: 'entityAdded', entity }, [entity, parent]);

        return entity;
    }

    private attach(id: EntityId, parent: Entity, index: number) {
        const entity = new Entity(id, this.tree);
        this.tree.insert(entity, parent, index);
        this.listenTo(entity);

        return entity;
    }

    private removeOne(entity: Entity) {
        const formerParent = this.requireParent(entity);
        const listened = this.listenedById.get(entity.id);

        listened?.unsubscribe();
        this.listenedById.delete(entity.id);
        this.tree.removeLeaf(entity);
        this.announceTreeChange({ kind: 'entityRemoved', entity, formerParent }, [entity, formerParent]);
    }

    private listenTo(entity: Entity) {
        const unsubscribe = entity.changed.subscribe((change) => this.forwardEntityChange(entity, change));
        this.listenedById.set(entity.id, { entity, unsubscribe });
    }

    private forwardEntityChange(entity: Entity, change: EntityChange) {
        const update: LevelUpdate = { ...change, entity };

        this.signals.entityVersions.increment(entity.id);
        this.signals.levelVersion.increment();
        this.signals.updated.emit(update);
    }

    // Every entity whose row shows the change gets a new version: the entity and the parents it left or joined.
    private announceTreeChange(update: LevelUpdate, touchedEntities: readonly Entity[]) {
        const touchedIds = new Set<EntityId>();
        for (const touched of touchedEntities) {
            touchedIds.add(touched.id);
        }

        for (const id of touchedIds) {
            this.signals.entityVersions.increment(id);
        }

        this.signals.treeVersion.increment();
        this.signals.levelVersion.increment();
        this.signals.updated.emit(update);
    }

    private announceLevelRenamed() {
        this.signals.levelVersion.increment();
        this.signals.updated.emit({ kind: 'levelRenamed' });
    }

    private requireInLevel(entity: Entity) {
        const listened = this.listenedById.get(entity.id);
        const isThisLevelsEntity = listened?.entity === entity;
        if (isThisLevelsEntity) return;

        throw new Error(`Entity ${entity.id} is not in this level.`);
    }

    private requireParent(entity: Entity) {
        const parent = entity.parent;
        if (parent === undefined) {
            throw new Error(`Entity ${entity.id} has no parent.`);
        }

        return parent;
    }
}
