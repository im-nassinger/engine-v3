import { describe, expect, test } from 'vitest';

import type { KeyCode } from '../../../core/keys/index.ts';

import { InputEdits } from './InputEdits.ts';

const keys = (...codes: string[]) => codes as KeyCode[];

const leftAndJump = [
    { name: 'left', keys: keys('KeyA', 'ArrowLeft') },
    { name: 'jump', keys: keys('Space') },
];

describe('InputEdits', () => {
    test('a new input has no key, named with the first number not taken', () => {
        expect(InputEdits.withNewInput([])).toEqual([{ name: 'input_1', keys: [] }]);
        expect(InputEdits.withNewInput([{ name: 'input_1', keys: keys('KeyQ') }])).toEqual([
            { name: 'input_1', keys: ['KeyQ'] },
            { name: 'input_2', keys: [] },
        ]);
    });

    test('renaming changes only that input, keeping its keys', () => {
        expect(InputEdits.renamed(leftAndJump, 1, 'Hop')).toEqual([
            { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
            { name: 'Hop', keys: ['Space'] },
        ]);
    });

    test('new keys replace only that input’s', () => {
        expect(InputEdits.withKeys(leftAndJump, 1, keys('Space', 'KeyW'))).toEqual([
            { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
            { name: 'jump', keys: ['Space', 'KeyW'] },
        ]);
    });

    test('removing drops that input', () => {
        expect(InputEdits.without(leftAndJump, 0)).toEqual([{ name: 'jump', keys: ['Space'] }]);
    });

    test('never changes the list it is given', () => {
        const given = InputEdits.withKeys(leftAndJump, 0, keys('KeyQ'));

        expect(given[1]).not.toBe(leftAndJump[1]);
        expect(leftAndJump[0]?.keys).toEqual(['KeyA', 'ArrowLeft']);
    });
});
