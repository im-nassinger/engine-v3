import { describe, expect, test } from 'vitest';

import { Level } from '../../entities/index.ts';

import { HiddenCache } from './HiddenCache.ts';

function buildGroupWithChild() {
    const level = Level.createNew();
    const group = level.createEntity(level.world, 0);
    const child = level.createEntity(group, 0);
    const cache = new HiddenCache(level);

    return { level, group, child, cache };
}

describe('HiddenCache', () => {
    test('an entity is hidden when it or any parent is hidden', () => {
        const { group, child, cache } = buildGroupWithChild();

        group.setHidden(true);

        expect(cache.isHidden(group)).toBe(true);
        expect(cache.isHidden(child)).toBe(true);
        expect(child.isHidden).toBe(false);
    });

    test('locked works the same way, apart from hidden', () => {
        const { group, child, cache } = buildGroupWithChild();

        group.setLocked(true);

        expect(cache.isLocked(child)).toBe(true);
        expect(cache.isHidden(child)).toBe(false);
    });

    test("marking a parent's switch marks the subtree", () => {
        const { group, child, cache } = buildGroupWithChild();
        expect(cache.isHidden(child)).toBe(false);

        group.setHidden(true);

        expect(cache.cachedCount).toBe(1);
        expect(cache.isHidden(child)).toBe(true);
    });

    test('values are computed only when asked', () => {
        const { group, cache } = buildGroupWithChild();

        expect(cache.cachedCount).toBe(0);
        cache.isHidden(group);
        expect(cache.cachedCount).toBe(2);
    });

    test('moving out of a hidden group shows the entity again', () => {
        const { level, group, child, cache } = buildGroupWithChild();
        group.setHidden(true);
        expect(cache.isHidden(child)).toBe(true);

        level.moveEntity(child, level.world, 0);

        expect(cache.isHidden(child)).toBe(false);
    });

    test('a removed entity is forgotten', () => {
        const { level, group, child, cache } = buildGroupWithChild();
        cache.isHidden(child);

        level.removeEntity(group);

        expect(cache.cachedCount).toBe(1);
    });
});
