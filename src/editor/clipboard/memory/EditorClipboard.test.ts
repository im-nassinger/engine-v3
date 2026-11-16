import { describe, expect, test } from 'vitest';

import { EditorClipboard } from './EditorClipboard.ts';
import type { SystemClipboard } from './SystemClipboard.ts';

// A system clipboard holding one text, which can refuse reads and writes.
class FakeSystemClipboard implements SystemClipboard {
    text = '';
    refusesReads = false;
    refusesWrites = false;

    writeText(text: string) {
        if (this.refusesWrites) return Promise.reject(new Error('Write refused.'));

        this.text = text;
        return Promise.resolve();
    }

    readText() {
        if (this.refusesReads) return Promise.reject(new Error('Read refused.'));

        return Promise.resolve(this.text);
    }
}

describe('EditorClipboard', () => {
    test('keeps a copy in memory and writes it to the system clipboard', async () => {
        const system = new FakeSystemClipboard();
        const clipboard = new EditorClipboard(system);

        clipboard.keep('copied');

        expect(clipboard.lastCopy).toBe('copied');
        expect(system.text).toBe('copied');
        await expect(clipboard.read()).resolves.toBe('copied');
    });

    test('reads what another program put on the system clipboard', async () => {
        const system = new FakeSystemClipboard();
        const clipboard = new EditorClipboard(system);
        clipboard.keep('copied');

        system.text = 'plain text';

        await expect(clipboard.read()).resolves.toBe('plain text');
    });

    test('reads the last copy when the system refuses the read', async () => {
        const system = new FakeSystemClipboard();
        const clipboard = new EditorClipboard(system);
        clipboard.keep('copied');

        system.text = 'plain text';
        system.refusesReads = true;

        await expect(clipboard.read()).resolves.toBe('copied');
    });

    test('keeps the copy in memory when the system refuses the write', async () => {
        const system = new FakeSystemClipboard();
        system.refusesWrites = true;
        system.refusesReads = true;
        const clipboard = new EditorClipboard(system);

        clipboard.keep('copied');

        await expect(clipboard.read()).resolves.toBe('copied');
    });

    test('without a system clipboard reads the last copy, or nothing before the first copy', async () => {
        const clipboard = new EditorClipboard();

        await expect(clipboard.read()).resolves.toBeUndefined();

        clipboard.keep('copied');
        await expect(clipboard.read()).resolves.toBe('copied');
    });
});
