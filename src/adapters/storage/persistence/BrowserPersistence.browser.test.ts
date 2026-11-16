import { describe, expect, test } from 'vitest';
import { BrowserPersistence } from './BrowserPersistence.ts';

describe('BrowserPersistence', () => {
    // Firefox asks the user and leaves the promise pending until they answer, which no one does in a test.
    test('asks the browser, which answers yes or no or waits for the user', async () => {
        const persistence = new BrowserPersistence();
        const stillWaiting = new Promise<'waiting'>((resolve) => window.setTimeout(() => resolve('waiting'), 1_000));

        const answer = await Promise.race([persistence.persist(), stillWaiting]);

        expect([true, false, 'waiting']).toContain(answer);
    });

    test('passes on a yes', async () => {
        const persistence = new BrowserPersistence(() => ({ persist: () => Promise.resolve(true) }));

        expect(await persistence.persist()).toBe(true);
    });

    test('a browser without the API counts as no', async () => {
        const persistence = new BrowserPersistence(() => undefined);

        expect(await persistence.persist()).toBe(false);
    });

    test('a request that fails counts as no', async () => {
        const failing = { persist: () => Promise.reject(new DOMException('Not allowed.', 'NotAllowedError')) };
        const persistence = new BrowserPersistence(() => failing);

        expect(await persistence.persist()).toBe(false);
    });
});
