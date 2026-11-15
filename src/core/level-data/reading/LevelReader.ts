import {
    BodyComponent,
    CameraComponent,
    NameComponent,
    PathComponent,
    PhysicsWorldComponent,
    ShapeComponent,
    StyleComponent,
    SurfaceComponent,
    TransformComponent,
} from '../../components/index.ts';
import type { AnyComponent, ComponentClass, ComponentRegistry } from '../../components/index.ts';
import { Level } from '../../level/index.ts';
import type { Entity } from '../../level/index.ts';
import { isPlainObject } from '../../fields/index.ts';
import type { EntityId } from '../../fields/index.ts';

import type { FormatUpgrader } from '../versions/FormatUpgrader.ts';
import { LEVEL_FORMAT } from '../LevelData.ts';
import type { LevelLimits } from '../LevelLimits.ts';
import { PhysicsVersions } from '../versions/PhysicsVersions.ts';
import type { ReadOutcome } from './ReadOutcome.ts';
import { ReadRefused } from './ReadRefused.ts';

type RawRecord = Readonly<Record<string, unknown>>;

// One entity once every value in it and inside it has been checked, before it is placed in a level.
type CheckedEntity = {
    readonly id: EntityId;
    readonly hidden: boolean;
    readonly locked: boolean;
    readonly components: readonly AnyComponent[];
    readonly children: readonly CheckedEntity[];
};

// What reading one tree of entities keeps track of on the way down: the ids seen and the entity count,
// which starts at the level's own count when entities go into a level.
type ReadingCount = {
    readonly seenIds: Set<EntityId>;
    entityCount: number;
};

const LEVEL_KEYS = ['format', 'formatVersion', 'physicsVersion', 'name', 'editor', 'world'];
const EDITOR_KEYS = ['gridSize', 'foldedRows'];
const ENTITY_KEYS = ['id', 'hidden', 'locked', 'components', 'children'];

// The World's own components: the file must hold them, because they are the level and can't be made up.
const WORLD_COMPONENTS: readonly ComponentClass<AnyComponent>[] = [
    ShapeComponent,
    StyleComponent,
    PhysicsWorldComponent,
];
// The World can't collide.
const COMPONENTS_THE_WORLD_CANT_TAKE: readonly ComponentClass<AnyComponent>[] = [BodyComponent, SurfaceComponent];

function isWholeNumber(raw: unknown): raw is number {
    return typeof raw === 'number' && Number.isSafeInteger(raw);
}

function isEntityId(raw: unknown): raw is EntityId {
    return isWholeNumber(raw) && raw >= 1;
}

// Every key must be one the shape knows, and every key it needs must be there.
function requireExactKeys(raw: unknown, expectedKeys: readonly string[], what: string): RawRecord {
    if (!isPlainObject(raw)) throw ReadRefused.damaged(`${what} is not an object`);

    const keys = Object.keys(raw);
    const unknownKey = keys.find((key) => !expectedKeys.includes(key));
    if (unknownKey !== undefined) throw ReadRefused.damaged(`${what} has an unknown value ${unknownKey}`);

    const missingKey = expectedKeys.find((key) => !Object.hasOwn(raw, key));
    if (missingKey !== undefined) throw ReadRefused.damaged(`${what} has no ${missingKey}`);

    return raw;
}

function requireBoolean(raw: unknown, what: string) {
    if (typeof raw !== 'boolean') throw ReadRefused.damaged(`${what} is not true or false`);

    return raw;
}

function hasComponent(entity: CheckedEntity, componentClass: ComponentClass<AnyComponent>) {
    return entity.components.some((component) => component instanceof componentClass);
}

// The entity and everything inside it, parents first.
function* entityAndInside(entity: CheckedEntity): Generator<CheckedEntity> {
    yield entity;

    for (const child of entity.children) {
        yield* entityAndInside(child);
    }
}

function pointCountOf(component: AnyComponent) {
    if (component instanceof ShapeComponent) {
        const geometry = component.get('geometry');
        if (geometry.kind === 'polygon' || geometry.kind === 'line') return geometry.points.length;

        return 0;
    }

    if (component instanceof PathComponent) {
        const path = component.get('path');
        return path.points.length;
    }

    return 0;
}

// The only code that turns data into a level. Data is untrusted until every entity, component and value
// has been checked here, so a damaged saved level and a damaged import fail the same way.
export class LevelReader {
    private readonly registry: ComponentRegistry;
    private readonly limits: LevelLimits;
    private readonly upgrader: FormatUpgrader;

    constructor(registry: ComponentRegistry, limits: LevelLimits, upgrader: FormatUpgrader) {
        this.registry = registry;
        this.limits = limits;
        this.upgrader = upgrader;
    }

    // level.json's text, as IndexedDB and the import worker hold it.
    readJson(text: string): ReadOutcome<Level> {
        let parsed: unknown;
        try {
            parsed = JSON.parse(text);
        } catch {
            return { ok: false, refusal: { reason: 'notALevel' } };
        }

        return this.read(parsed);
    }

    read(raw: unknown): ReadOutcome<Level> {
        try {
            const level = this.readLevel(raw);
            return { ok: true, value: level };
        } catch (error) {
            if (error instanceof ReadRefused) return { ok: false, refusal: error.refusal };

            throw error;
        }
    }

    // Roots as LevelWriter.writeSubtree gave them, each with its children nested inside, put back into a
    // level with their ids: undo of a delete, and paste once its ids are replaced. The roots go into the
    // parent from the index on, in their order. Everything is checked before the level changes, so a refusal
    // leaves it as it was. Gives the roots.
    readSubtree(level: Level, raw: unknown, parent: Entity, index: number): ReadOutcome<readonly Entity[]> {
        const isPlaceInParent = Number.isSafeInteger(index) && index >= 0 && index <= parent.children.length;
        if (!isPlaceInParent) {
            throw new Error(`Index ${index} is not a place among entity ${parent.id}'s children.`);
        }

        try {
            const entities = this.readSubtreeEntities(level, raw, parent);
            const roots = this.buildSubtree(level, entities, parent, index);
            return { ok: true, value: roots };
        } catch (error) {
            if (error instanceof ReadRefused) return { ok: false, refusal: error.refusal };

            throw error;
        }
    }

    private readLevel(raw: unknown) {
        const fileVersion = this.checkFormat(raw);
        const upgraded = this.upgrader.upgrade(raw, fileVersion);
        const levelData = requireExactKeys(upgraded, LEVEL_KEYS, 'the level');

        this.checkPhysicsVersion(levelData['physicsVersion'], fileVersion);

        const world = this.readWorld(levelData['world']);
        const level = this.buildLevel(world);

        this.readName(levelData['name'], level);
        this.readEditorData(levelData['editor'], level);

        return level;
    }

    // Returns the file's format version, once it is known to be one this game can upgrade.
    private checkFormat(raw: unknown) {
        const isLevel = isPlainObject(raw) && raw['format'] === LEVEL_FORMAT;
        if (!isLevel) throw new ReadRefused({ reason: 'notALevel' });

        const fileVersion = raw['formatVersion'];
        if (!isWholeNumber(fileVersion) || fileVersion < 1) {
            throw ReadRefused.damaged('the format version is not a whole number from 1');
        }

        const isNewer = fileVersion > this.upgrader.latestVersion;
        if (isNewer) throw new ReadRefused({ reason: 'newerVersion', fileVersion });

        return fileVersion;
    }

    // A physics version past the table's last can only come from a newer game.
    private checkPhysicsVersion(raw: unknown, fileVersion: number) {
        if (!isWholeNumber(raw) || raw < 1) {
            throw ReadRefused.damaged('the physics version is not a whole number from 1');
        }

        const isNewer = raw > PhysicsVersions.current;
        if (isNewer) throw new ReadRefused({ reason: 'newerVersion', fileVersion });
    }

    private readWorld(raw: unknown) {
        const count: ReadingCount = { seenIds: new Set(), entityCount: 0 };
        const world = this.readEntity(raw, 0, count);

        this.checkWorldAndCamera(world);

        return world;
    }

    // Depth and count are checked on the way down, before anything inside is read, so a file nested
    // thousands deep stops at the limit instead of running out of stack.
    private readEntity(raw: unknown, depth: number, count: ReadingCount): CheckedEntity {
        this.checkDepth(depth);
        this.countEntity(count);

        const entityData = requireExactKeys(raw, ENTITY_KEYS, 'an entity');

        const id = entityData['id'];
        if (!isEntityId(id)) throw ReadRefused.damaged('an entity id is not a whole number from 1');
        if (count.seenIds.has(id)) throw ReadRefused.damaged(`entity id ${id} is used twice`);
        count.seenIds.add(id);

        const hidden = requireBoolean(entityData['hidden'], `entity ${id}'s hidden`);
        const locked = requireBoolean(entityData['locked'], `entity ${id}'s locked`);
        const components = this.readComponents(entityData['components'], id);

        const rawChildren = entityData['children'];
        if (!Array.isArray(rawChildren)) throw ReadRefused.damaged(`entity ${id}'s children are not a list`);

        const children = rawChildren.map((rawChild: unknown) => this.readEntity(rawChild, depth + 1, count));

        return { id, hidden, locked, components, children };
    }

    private countEntity(count: ReadingCount) {
        count.entityCount += 1;

        if (count.entityCount > this.limits.maxEntities) {
            throw new ReadRefused({ reason: 'overLimit', limit: 'entities', max: this.limits.maxEntities });
        }
    }

    private checkDepth(depth: number) {
        if (depth > this.limits.maxDepth) {
            throw new ReadRefused({ reason: 'overLimit', limit: 'depth', max: this.limits.maxDepth });
        }
    }

    // A missing TransformComponent or NameComponent reads as its defaults, because every entity has one.
    private readComponents(raw: unknown, entityId: EntityId) {
        if (!isPlainObject(raw)) throw ReadRefused.damaged(`entity ${entityId}'s components are not an object`);

        const components: AnyComponent[] = [];
        for (const [typeName, rawValues] of Object.entries(raw)) {
            const componentClass = this.registry.find(typeName);
            if (componentClass === undefined) {
                throw ReadRefused.damaged(`entity ${entityId} has an unknown component ${typeName}`);
            }

            const component = this.readComponent(componentClass, rawValues, entityId);
            components.push(component);
        }

        const hasTransform = components.some((component) => component instanceof TransformComponent);
        if (!hasTransform) {
            components.push(new TransformComponent());
        }

        const hasName = components.some((component) => component instanceof NameComponent);
        if (!hasName) {
            components.push(new NameComponent());
        }

        return components;
    }

    // A missing value reads as its default, so a field added later needs no upgrade step.
    private readComponent(componentClass: ComponentClass<AnyComponent>, raw: unknown, entityId: EntityId) {
        const typeName = componentClass.schema.typeName;
        const what = `entity ${entityId}'s ${typeName}`;
        if (!isPlainObject(raw)) throw ReadRefused.damaged(`${what} is not an object`);

        const component = new componentClass();
        for (const [fileKey, rawValue] of Object.entries(raw)) {
            const entry = component.schema.findEntryByFileKey(fileKey);
            if (entry === undefined) throw ReadRefused.damaged(`${what} has an unknown value ${fileKey}`);

            const written = component.writeValue(entry.key, rawValue);
            if (!written.ok) throw ReadRefused.damaged(`${what}'s ${fileKey} is refused: ${written.problem.reason}`);
        }

        const pointCount = pointCountOf(component);
        if (pointCount > this.limits.maxPoints) {
            throw new ReadRefused({ reason: 'overLimit', limit: 'points', max: this.limits.maxPoints });
        }

        return component;
    }

    private checkWorldAndCamera(world: CheckedEntity) {
        for (const worldComponent of WORLD_COMPONENTS) {
            if (!hasComponent(world, worldComponent)) {
                throw ReadRefused.damaged(`the World has no ${worldComponent.schema.typeName}`);
            }
        }

        for (const refused of COMPONENTS_THE_WORLD_CANT_TAKE) {
            if (hasComponent(world, refused)) {
                throw ReadRefused.damaged(`the World can't have a ${refused.schema.typeName}`);
            }
        }

        const worldShape = world.components.find((component) => component instanceof ShapeComponent);
        const worldGeometry = worldShape?.get('geometry');
        if (worldGeometry?.kind !== 'rectangle') throw ReadRefused.damaged("the World's shape is not a rectangle");

        const elsewhere = [...entityAndInside(world)].slice(1);
        const physicsWorldElsewhere = elsewhere.some((entity) => hasComponent(entity, PhysicsWorldComponent));
        if (physicsWorldElsewhere) throw ReadRefused.damaged('a PhysicsWorldComponent is not on the World');

        const cameras = elsewhere.filter((entity) => hasComponent(entity, CameraComponent));
        const camera = cameras[0];
        if (cameras.length !== 1 || camera === undefined) {
            throw ReadRefused.damaged(`the level has ${cameras.length} cameras, not 1`);
        }

        const isInWorld = world.children.includes(camera);
        if (!isInWorld) throw ReadRefused.damaged('the camera is not directly inside the World');
    }

    private readSubtreeEntities(level: Level, raw: unknown, parent: Entity) {
        if (!Array.isArray(raw)) throw ReadRefused.damaged('the entities are not a list');
        if (raw.length === 0) throw ReadRefused.damaged('the entities are an empty list');

        const rootDepth = parent.depth + 1;
        const count: ReadingCount = { seenIds: new Set(), entityCount: level.entityCount };
        const roots = raw.map((rawRoot: unknown) => this.readEntity(rawRoot, rootDepth, count));

        this.checkSubtreeEntities(level, roots);

        return roots;
    }

    // The World and the camera are never copied or removed, so their components can't come back this way.
    private checkSubtreeEntities(level: Level, roots: readonly CheckedEntity[]) {
        for (const root of roots) {
            for (const entity of entityAndInside(root)) {
                const isInLevel = level.findEntity(entity.id) !== undefined;
                if (isInLevel) throw ReadRefused.damaged(`entity id ${entity.id} is already in the level`);

                if (hasComponent(entity, PhysicsWorldComponent)) {
                    throw ReadRefused.damaged('a PhysicsWorldComponent is not on the World');
                }

                if (hasComponent(entity, CameraComponent)) {
                    throw ReadRefused.damaged('a second camera');
                }
            }
        }
    }

    // The entities are already checked, so nothing here can refuse.
    private buildSubtree(level: Level, roots: readonly CheckedEntity[], parent: Entity, index: number) {
        return roots.map((checked, offset) => {
            const root = level.restoreEntity(checked.id, parent, index + offset);
            this.fillEntity(root, checked);
            this.placeChildren(level, root, checked);

            return root;
        });
    }

    // The entities are already checked, so nothing here can refuse.
    private buildLevel(world: CheckedEntity) {
        const camera = world.children.find((child) => hasComponent(child, CameraComponent));
        if (camera === undefined) {
            throw new Error('The camera was checked before building.');
        }

        const level = Level.createEmpty(world.id, camera.id);
        this.fillEntity(level.world, world);
        this.placeChildren(level, level.world, world);

        // The camera starts as the World's first child, so it moves to its place once its siblings are in.
        const cameraIndex = world.children.indexOf(camera);
        level.moveEntity(level.camera, level.world, cameraIndex);

        return level;
    }

    // Puts each checked child at the end of the entity's children, in order, and everything inside it. The
    // camera already exists in a new level, so it is filled where it is.
    private placeChildren(level: Level, entity: Entity, checked: CheckedEntity) {
        for (const checkedChild of checked.children) {
            const isCamera = checkedChild.id === level.camera.id;
            const child = isCamera
                ? level.camera
                : level.restoreEntity(checkedChild.id, entity, entity.children.length);

            this.fillEntity(child, checkedChild);
            this.placeChildren(level, child, checkedChild);
        }
    }

    private fillEntity(entity: Entity, checked: CheckedEntity) {
        entity.setHidden(checked.hidden);
        entity.setLocked(checked.locked);

        for (const component of checked.components) {
            entity.addComponent(component);
        }
    }

    private readName(raw: unknown, level: Level) {
        if (typeof raw !== 'string') throw ReadRefused.damaged("the level's name is not text");

        const renamed = level.rename(raw);
        if (!renamed.renamed) throw ReadRefused.damaged(`the level's name is refused: ${renamed.reason}`);
    }

    // Folded rows of entities no longer in the level are dropped: folding never removes them on delete.
    private readEditorData(raw: unknown, level: Level) {
        const editorData = requireExactKeys(raw, EDITOR_KEYS, 'the editor data');

        const gridSize = editorData['gridSize'];
        const isFiniteNumber = typeof gridSize === 'number' && Number.isFinite(gridSize);
        if (!isFiniteNumber) throw ReadRefused.damaged('the grid size is not a number');

        level.editorData.setGridSize(gridSize);

        const foldedRows = editorData['foldedRows'];
        if (!Array.isArray(foldedRows)) throw ReadRefused.damaged('the folded rows are not a list');

        for (const foldedId of foldedRows) {
            if (!isEntityId(foldedId)) throw ReadRefused.damaged('a folded row is not an entity id');

            const isInLevel = level.findEntity(foldedId) !== undefined;
            if (isInLevel) {
                level.editorData.setFolded(foldedId, true);
            }
        }
    }
}
