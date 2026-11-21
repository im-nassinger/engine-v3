import { describe, expect, test } from 'vitest';

import { TOOL_KEYS } from './toolKeys.ts';

describe('TOOL_KEYS', () => {
    test('gives the seven tools the number keys the requirement lists', () => {
        expect(TOOL_KEYS).toEqual({
            select: '1',
            shape: '2',
            joint: '3',
            pen: '4',
            pencil: '5',
            text: '6',
            trigger: '7',
        });
    });
});
