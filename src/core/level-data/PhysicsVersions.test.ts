import { describe, expect, test } from 'vitest';

import { PhysicsVersions } from './PhysicsVersions.ts';

describe('PhysicsVersions', () => {
    test('names the Box2D build of the current version', () => {
        const build = PhysicsVersions.buildOf(PhysicsVersions.current);

        expect(build).toEqual({ physicsVersion: 1, box2dWasmVersion: '6.0.0', box2dVersion: '3.2' });
    });

    test('has one row per version, counting up from 1 without gaps', () => {
        const versions = PhysicsVersions.all().map((build) => build.physicsVersion);
        const expected = versions.map((_, index) => index + 1);

        expect(versions).toEqual(expected);
        expect(versions.at(-1)).toBe(PhysicsVersions.current);
    });
});
