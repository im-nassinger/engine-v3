import { describe, expect, test } from 'vitest';

import { VersionCounter } from './VersionCounter.ts';

describe('VersionCounter', () => {
    test('starts at 0 and counts up by one', () => {
        const counter = new VersionCounter();

        counter.increment();
        counter.increment();

        expect(counter.version).toBe(2);
    });

    test('listeners see the new version', () => {
        const counter = new VersionCounter();
        const seenVersions: number[] = [];

        counter.subscribe(() => seenVersions.push(counter.version));
        counter.increment();

        expect(seenVersions).toEqual([1]);
    });

    test('an unsubscribed listener is not called', () => {
        const counter = new VersionCounter();
        let callCount = 0;

        const unsubscribe = counter.subscribe(() => callCount++);
        unsubscribe();
        counter.increment();

        expect(callCount).toBe(0);
    });
});
