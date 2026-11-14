import { describe, expect, test } from 'vitest';

import { EntityIdAllocator } from './EntityIdAllocator.ts';

describe('EntityIdAllocator', () => {
    test('counts up from 1', () => {
        const allocator = new EntityIdAllocator();

        const first = allocator.next();
        const second = allocator.next();

        expect([first, second]).toEqual([1, 2]);
    });

    test('reserve raises the highest and never lowers it', () => {
        const allocator = new EntityIdAllocator();

        allocator.reserve(10);
        allocator.reserve(4);

        expect(allocator.highest).toBe(10);
        expect(allocator.next()).toBe(11);
    });
});
