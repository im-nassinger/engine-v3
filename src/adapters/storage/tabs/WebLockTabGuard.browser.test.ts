import { describe, expect, test } from 'vitest';
import { WebLockTabGuard } from './WebLockTabGuard.ts';

let lockCount = 0;

function newLockName() {
    lockCount += 1;

    return `engine-v3/level-test-${Date.now()}-${lockCount}`;
}

describe('WebLockTabGuard', () => {
    test('the first request gets the lock', async () => {
        const guard = new WebLockTabGuard({ lockName: newLockName() });

        expect(await guard.acquire()).toBe(true);
    });

    test('a second request for the same lock gets none, as a second tab would', async () => {
        const lockName = newLockName();
        const firstTab = new WebLockTabGuard({ lockName });
        const secondTab = new WebLockTabGuard({ lockName });

        const firstHasLock = await firstTab.acquire();
        const secondHasLock = await secondTab.acquire();

        expect(firstHasLock).toBe(true);
        expect(secondHasLock).toBe(false);
    });

    test('the lock is held after it is given', async () => {
        const lockName = newLockName();
        await new WebLockTabGuard({ lockName }).acquire();

        const state = await navigator.locks.query();
        const heldNames = state.held?.map((lock) => lock.name);

        expect(heldNames).toContain(lockName);
    });

    test('a browser without Web Locks gives the lock', async () => {
        const guard = new WebLockTabGuard({ locks: () => undefined, lockName: newLockName() });

        expect(await guard.acquire()).toBe(true);
    });

    test('a request the browser refuses gives the lock', async () => {
        const refusingLocks = {
            request: () => Promise.reject(new DOMException('Not allowed.', 'SecurityError')),
            query: () => Promise.resolve({}),
        } as unknown as LockManager;
        const guard = new WebLockTabGuard({ locks: () => refusingLocks, lockName: newLockName() });

        expect(await guard.acquire()).toBe(true);
    });
});
