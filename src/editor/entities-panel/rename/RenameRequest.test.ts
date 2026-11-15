import { describe, expect, test } from 'vitest';

import { RenameRequest } from './RenameRequest.ts';

describe('RenameRequest', () => {
    test('holds the asked entity until cleared', () => {
        const request = new RenameRequest();
        expect(request.entityId).toBeUndefined();

        request.request(7);
        expect(request.entityId).toBe(7);

        request.clear();
        expect(request.entityId).toBeUndefined();
    });

    test('moves its version on each ask, even for the same entity, and on clearing', () => {
        const request = new RenameRequest();
        let calls = 0;
        request.version.subscribe(() => (calls += 1));

        request.request(7);
        request.request(7);
        request.clear();

        expect(calls).toBe(3);
        expect(request.version.version).toBe(3);
    });

    test('clearing with nothing asked does nothing', () => {
        const request = new RenameRequest();

        request.clear();

        expect(request.version.version).toBe(0);
    });
});
