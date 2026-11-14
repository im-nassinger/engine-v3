import { describe, expect, test } from 'vitest';

import { NameComponent, TransformComponent } from '../components/index.ts';
import { WeightComponent } from '../components/testing/index.ts';

import type { Entity } from './Entity.ts';
import { entityName } from './entityName.ts';
import { Level } from './Level.ts';
import type { LevelUpdate } from './LevelUpdate.ts';

function recordUpdates(level: Level) {
    const updates: LevelUpdate[] = [];
    level.signals.updated.subscribe((update) => updates.push(update));

    return updates;
}

function idsOf(entities: Iterable<Entity>) {
    const ids: number[] = [];

    for (const entity of entities) {
        ids.push(entity.id);
    }

    return ids;
}

function buildChain(level: Level, length: number) {
    let deepest = level.world;

    for (let i = 0; i < length; i++) {
        deepest = level.createEntity(deepest, 0);
    }

    return deepest;
}

describe('Level ids', () => {
    test('a new level has the World as id 1 and the camera as id 2, inside the World', () => {
        const level = Level.createNew();

        expect(level.world.id).toBe(1);
        expect(level.camera.id).toBe(2);
        expect(level.camera.parent).toBe(level.world);
        expect(level.world.parent).toBeUndefined();
        expect(level.entityCount).toBe(2);
    });

    test('the World and the camera are named, and each has a TransformComponent at the origin', () => {
        const level = Level.createNew();
        const cameraTransform = level.camera.requireComponent(TransformComponent);

        expect(entityName(level.world)).toBe('World');
        expect(entityName(level.camera)).toBe('Camera');
        expect(level.world.hasComponent(TransformComponent)).toBe(true);
        expect(level.world.hasComponent(NameComponent)).toBe(true);
        expect(cameraTransform.get('position')).toEqual({ x: 0, y: 0 });
    });

    test('ids only count up, and a removed id is never handed out again', () => {
        const level = Level.createNew();
        const crate = level.createEntity(level.world, 0);
        level.removeEntity(crate);

        const next = level.createEntity(level.world, 0);

        expect(crate.id).toBe(3);
        expect(next.id).toBe(4);
        expect(level.findEntity(3)).toBeUndefined();
    });

    test('restoreEntity with a known id raises the highest', () => {
        const level = Level.createNew();

        const restored = level.restoreEntity(40, level.world, 0);
        const next = level.createEntity(level.world, 0);

        expect(level.requireEntity(40)).toBe(restored);
        expect(next.id).toBe(41);
    });

    test('restoreEntity refuses an id already in the level', () => {
        const level = Level.createNew();

        expect(() => level.restoreEntity(2, level.world, 0)).toThrow('already in the level');
    });
});

describe('Level moves', () => {
    test('moving the World is refused', () => {
        const level = Level.createNew();
        const crate = level.createEntity(level.world, 0);

        expect(level.moveEntity(level.world, crate, 0)).toEqual({ moved: false, reason: 'world' });
    });

    test('the camera may only move directly inside the World', () => {
        const level = Level.createNew();
        const crate = level.createEntity(level.world, 0);

        const intoCrate = level.moveEntity(level.camera, crate, 0);
        const reordered = level.moveEntity(level.camera, level.world, 0);

        expect(intoCrate).toEqual({ moved: false, reason: 'cameraOutsideWorld' });
        expect(reordered).toEqual({ moved: true });
        expect(level.world.children).toEqual([level.camera, crate]);
    });

    test('moving an entity into itself or into its own child is a cycle', () => {
        const level = Level.createNew();
        const group = level.createEntity(level.world, 0);
        const child = level.createEntity(group, 0);

        expect(level.moveEntity(group, group, 0)).toEqual({ moved: false, reason: 'cycle' });
        expect(level.moveEntity(group, child, 0)).toEqual({ moved: false, reason: 'cycle' });
    });

    test('a move that would go past 256 deep is refused, 256 itself is allowed', () => {
        const level = Level.createNew();
        const deepest = buildChain(level, 255);
        const group = level.createEntity(level.world, 0);
        const child = level.createEntity(group, 0);

        const groupWithChild = level.moveEntity(group, deepest, 0);
        const childAlone = level.moveEntity(child, deepest, 0);

        expect(deepest.depth).toBe(255);
        expect(groupWithChild).toEqual({ moved: false, reason: 'tooDeep' });
        expect(childAlone).toEqual({ moved: true });
        expect(child.depth).toBe(256);
    });

    test('creating an entity past 256 deep is a programming error', () => {
        const level = Level.createNew();
        const deepest = buildChain(level, 256);

        expect(() => level.createEntity(deepest, 0)).toThrow('256 deep');
    });

    test('the index is the position among the new siblings after the move', () => {
        const level = Level.createNew();
        const first = level.createEntity(level.world, 1);
        const second = level.createEntity(level.world, 2);

        level.moveEntity(level.camera, level.world, 2);

        expect(level.world.children).toEqual([first, second, level.camera]);
    });
});

describe('Level removal', () => {
    test('the World and the camera can never be removed', () => {
        const level = Level.createNew();

        expect(() => level.removeEntity(level.world)).toThrow('never removed');
        expect(() => level.removeEntity(level.camera)).toThrow('never removed');
    });

    test('removing an entity removes its whole subtree, children first', () => {
        const level = Level.createNew();
        const group = level.createEntity(level.world, 0);
        const child = level.createEntity(group, 0);
        const grandchild = level.createEntity(child, 0);
        const updates = recordUpdates(level);

        level.removeEntity(group);

        expect(level.entityCount).toBe(2);
        expect(level.findEntity(child.id)).toBeUndefined();
        expect(updates).toEqual([
            { kind: 'entityRemoved', entity: grandchild, formerParent: child },
            { kind: 'entityRemoved', entity: child, formerParent: group },
            { kind: 'entityRemoved', entity: group, formerParent: level.world },
        ]);
    });

    test('a removed entity is no longer accepted by the level', () => {
        const level = Level.createNew();
        const crate = level.createEntity(level.world, 0);
        level.removeEntity(crate);

        expect(() => level.createEntity(crate, 0)).toThrow('not in this level');
    });
});

describe('Level order', () => {
    test('panel order is the pre-order walk, top row first; draw order is the World, then that walk backwards', () => {
        const level = Level.createNew();
        const group = level.createEntity(level.world, 0);
        const child = level.createEntity(group, 0);
        const lowest = level.createEntity(level.world, 2);

        const panelIds = idsOf(level.entitiesInPanelOrder());
        const drawIds = idsOf(level.entitiesInDrawOrder());

        expect(panelIds).toEqual([level.world.id, group.id, child.id, level.camera.id, lowest.id]);
        expect(drawIds).toEqual([level.world.id, lowest.id, level.camera.id, child.id, group.id]);
    });
});

describe('Level signals', () => {
    test('adding and moving raise the right updates and move the tree version on', () => {
        const level = Level.createNew();
        const updates = recordUpdates(level);
        const treeVersionBefore = level.signals.treeVersion.version;

        const crate = level.createEntity(level.world, 0);
        const group = level.createEntity(level.world, 0);
        level.moveEntity(crate, group, 0);

        expect(updates).toEqual([
            { kind: 'entityAdded', entity: crate },
            { kind: 'entityAdded', entity: group },
            { kind: 'entityMoved', entity: crate, formerParent: level.world },
        ]);
        expect(level.signals.treeVersion.version).toBe(treeVersionBefore + 3);
    });

    test('a refused move raises nothing', () => {
        const level = Level.createNew();
        const updates = recordUpdates(level);

        level.moveEntity(level.world, level.camera, 0);

        expect(updates).toEqual([]);
    });

    test('component and switch changes reach the level with their entity', () => {
        const level = Level.createNew();
        const crate = level.createEntity(level.world, 0);
        const weight = new WeightComponent();
        const updates = recordUpdates(level);
        const treeVersionBefore = level.signals.treeVersion.version;

        crate.addComponent(weight);
        weight.set('weight', 20);
        crate.setHidden(true);
        crate.removeComponent(WeightComponent);

        expect(updates).toEqual([
            { kind: 'componentAdded', entity: crate, component: weight },
            { kind: 'valueChanged', entity: crate, component: weight, key: 'weight' },
            { kind: 'switchChanged', entity: crate, switchName: 'hidden' },
            { kind: 'componentRemoved', entity: crate, component: weight },
        ]);
        expect(level.signals.treeVersion.version).toBe(treeVersionBefore);
    });

    test("a removed component's changes no longer reach the level", () => {
        const level = Level.createNew();
        const crate = level.createEntity(level.world, 0);
        const weight = new WeightComponent();
        crate.addComponent(weight);
        crate.removeComponent(WeightComponent);
        const updates = recordUpdates(level);
        const levelVersionBefore = level.signals.levelVersion.version;

        weight.set('weight', 30);

        expect(updates).toEqual([]);
        expect(level.signals.levelVersion.version).toBe(levelVersionBefore);
    });

    test("a removed entity's changes no longer reach the level", () => {
        const level = Level.createNew();
        const crate = level.createEntity(level.world, 0);
        level.removeEntity(crate);
        const updates = recordUpdates(level);

        crate.setHidden(true);

        expect(updates).toEqual([]);
    });

    test("a change to one entity wakes only that entity's listeners", () => {
        const level = Level.createNew();
        const first = level.createEntity(level.world, 0);
        const second = level.createEntity(level.world, 0);
        const woken: string[] = [];
        level.signals.entityVersions.subscribe(first.id, () => woken.push('first'));
        level.signals.entityVersions.subscribe(second.id, () => woken.push('second'));

        first.setLocked(true);

        expect(woken).toEqual(['first']);
        expect(level.signals.entityVersions.version(first.id)).toBeGreaterThan(0);
    });

    test('a move wakes the entity and both parents', () => {
        const level = Level.createNew();
        const fromGroup = level.createEntity(level.world, 0);
        const toGroup = level.createEntity(level.world, 0);
        const crate = level.createEntity(fromGroup, 0);
        const woken: number[] = [];
        for (const entity of [level.world, level.camera, fromGroup, toGroup, crate]) {
            level.signals.entityVersions.subscribe(entity.id, () => woken.push(entity.id));
        }

        level.moveEntity(crate, toGroup, 0);

        expect(woken).toEqual([crate.id, fromGroup.id, toGroup.id]);
    });

    test('every change moves the level version on', () => {
        const level = Level.createNew();
        const before = level.signals.levelVersion.version;

        const crate = level.createEntity(level.world, 0);
        crate.setHidden(true);
        level.rename('Bridge');

        expect(level.signals.levelVersion.version).toBe(before + 3);
    });
});

describe('Level name', () => {
    test('a new level is called Untitled level', () => {
        expect(Level.createNew().name).toBe('Untitled level');
    });

    test('a name is trimmed, and raises levelRenamed', () => {
        const level = Level.createNew();
        const updates = recordUpdates(level);

        const outcome = level.rename('  Bridge  ');

        expect(outcome).toEqual({ renamed: true, name: 'Bridge' });
        expect(level.name).toBe('Bridge');
        expect(updates).toEqual([{ kind: 'levelRenamed' }]);
    });

    test('an empty name and a name past 60 characters are refused', () => {
        const level = Level.createNew();
        const sixtyCharacters = 'é'.repeat(60);

        expect(level.rename('   ')).toEqual({ renamed: false, reason: 'empty' });
        expect(level.rename(sixtyCharacters + 'x')).toEqual({ renamed: false, reason: 'tooLong' });
        expect(level.rename(sixtyCharacters)).toEqual({ renamed: true, name: sixtyCharacters });
    });

    test('renaming to the same name raises nothing', () => {
        const level = Level.createNew();
        const updates = recordUpdates(level);

        level.rename('Untitled level');

        expect(updates).toEqual([]);
    });
});
