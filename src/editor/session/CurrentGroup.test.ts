import { describe, expect, test } from 'vitest';

import { Level } from '../../core/entities/index.ts';

import { CurrentGroup } from './CurrentGroup.ts';

function buildNestedGroups() {
    const level = Level.createNew();
    const outer = level.createEntity(level.world, 0);
    const inner = level.createEntity(outer, 0);
    const innermost = level.createEntity(inner, 0);
    const currentGroup = new CurrentGroup(level);

    return { level, outer, inner, innermost, currentGroup };
}

describe('CurrentGroup', () => {
    test('starts in the World', () => {
        const { level, currentGroup } = buildNestedGroups();

        expect(currentGroup.group).toBe(level.world);
        expect(currentGroup.path).toEqual([level.world.id]);
    });

    test('the path goes from the World down to the group', () => {
        const { level, outer, inner, currentGroup } = buildNestedGroups();

        currentGroup.enter(inner);

        expect(currentGroup.path).toEqual([level.world.id, outer.id, inner.id]);
    });

    test('exitOne goes up one group and returns the group it left', () => {
        const { level, outer, inner, currentGroup } = buildNestedGroups();
        currentGroup.enter(inner);

        expect(currentGroup.exitOne()).toBe(inner);
        expect(currentGroup.group).toBe(outer);
        expect(currentGroup.exitOne()).toBe(outer);
        expect(currentGroup.exitOne()).toBeUndefined();
        expect(currentGroup.group).toBe(level.world);
    });

    test('a removed current group falls back to its nearest parent', () => {
        const { level, outer, inner, currentGroup } = buildNestedGroups();
        currentGroup.enter(inner);

        level.removeEntity(inner);

        expect(currentGroup.group).toBe(outer);
    });

    test('removing a parent of the current group lands in what is left', () => {
        const { level, outer, innermost, currentGroup } = buildNestedGroups();
        currentGroup.enter(innermost);

        level.removeEntity(outer);

        expect(currentGroup.group).toBe(level.world);
    });

    test('restore lands in the nearest group that still exists', () => {
        const { level, outer, inner, innermost, currentGroup } = buildNestedGroups();
        currentGroup.enter(innermost);
        const path = currentGroup.path;

        level.removeEntity(inner);
        currentGroup.restore(path);

        expect(currentGroup.group).toBe(outer);

        currentGroup.restore([level.world.id, 998, 999]);

        expect(currentGroup.group).toBe(level.world);
    });

    test('moving the group or a parent of it moves the version', () => {
        const { level, outer, inner, currentGroup } = buildNestedGroups();
        currentGroup.enter(inner);
        const versionBefore = currentGroup.version.version;

        level.moveEntity(outer, level.world, 1);

        expect(currentGroup.version.version).toBe(versionBefore + 1);
        expect(currentGroup.group).toBe(inner);
    });

    test('entering an entity from another level is a bug', () => {
        const { currentGroup } = buildNestedGroups();
        const otherLevel = Level.createNew();
        const stranger = otherLevel.createEntity(otherLevel.world, 0);

        expect(() => currentGroup.enter(stranger)).toThrow();
    });
});
