import { describe, expect, test } from 'vitest';

import { buildChangesTestLevel, snapshotOf } from './changesTestLevel.ts';
import { RenameLevelChange } from './RenameLevelChange.ts';

describe('RenameLevelChange', () => {
    test('renames the level, and revert gives back the level exactly', () => {
        const { level } = buildChangesTestLevel();
        const before = snapshotOf(level);
        const change = new RenameLevelChange(level.name, 'Cave');

        change.apply(level);
        expect(level.name).toBe('Cave');

        change.revert(level);
        expect(snapshotOf(level)).toEqual(before);
    });

    test('throws on a name the level refuses, because the command checks it first', () => {
        const { level } = buildChangesTestLevel();
        const change = new RenameLevelChange(level.name, '   ');

        const apply = () => change.apply(level);

        expect(apply).toThrow('The level refused the name "   ": empty.');
        expect(level.name).toBe('Untitled level');
    });
});
