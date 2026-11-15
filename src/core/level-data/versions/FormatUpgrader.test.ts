import { describe, expect, test } from 'vitest';

import { FormatUpgrader } from './FormatUpgrader.ts';
import { CURRENT_FORMAT_VERSION } from '../LevelData.ts';

function addStepMark(mark: string) {
    return (fileData: unknown) => {
        const marks = fileData as string[];

        return [...marks, mark];
    };
}

describe('FormatUpgrader', () => {
    test('has no steps in v1, so its latest version is the one the writer writes', () => {
        const upgrader = FormatUpgrader.createV1();

        expect(upgrader.latestVersion).toBe(CURRENT_FORMAT_VERSION);
        expect(upgrader.upgrade({ kept: true }, 1)).toEqual({ kept: true });
    });

    test('runs every step from the file version up to the latest, in order', () => {
        const upgrader = new FormatUpgrader([addStepMark('1 to 2'), addStepMark('2 to 3'), addStepMark('3 to 4')]);

        expect(upgrader.latestVersion).toBe(4);
        expect(upgrader.upgrade([], 1)).toEqual(['1 to 2', '2 to 3', '3 to 4']);
        expect(upgrader.upgrade([], 3)).toEqual(['3 to 4']);
        expect(upgrader.upgrade([], 4)).toEqual([]);
    });

    test('throws for a version it does not know, which the reader refuses first', () => {
        const upgrader = new FormatUpgrader([addStepMark('1 to 2')]);

        expect(() => upgrader.upgrade([], 0)).toThrow();
        expect(() => upgrader.upgrade([], 3)).toThrow();
        expect(() => upgrader.upgrade([], 1.5)).toThrow();
    });
});
