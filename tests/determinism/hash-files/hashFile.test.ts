import { describe, expect, test } from 'vitest';

import { readHashFile, writeHashFile } from './hashFile.ts';

describe('the recorded hashes file', () => {
    test('reads back what it wrote, skipping its note', () => {
        const ticks = [
            { tick: 1, hash: '0a1b2c3d', bodies: [{ entityId: 3, hash: '4e5f6a7b' }] },
            { tick: 2, hash: '8c9d0e1f', bodies: [] },
        ];
        const text = writeHashFile('crates', ticks);

        expect(text.split('\n')[1]).toBe('1 0a1b2c3d 3:4e5f6a7b');
        expect(readHashFile(text)).toEqual(ticks);
    });
});
