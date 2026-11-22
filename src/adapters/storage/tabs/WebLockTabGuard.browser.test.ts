import { describe, expect, test } from 'vitest';
import { WebLockTabGuard } from './WebLockTabGuard.ts';

let lockCount = 0;

function newLockName() {
    lockCount += 1;

    return `engine-v3/level-test-${Date.now()}-${lockCount}`;
}

async function heldLockNames() {
    const state = await navigator.locks.query();

    return state.held?.map((lock) => lock.name) ?? [];
}

// Each guard is one tab: they share the lock and the channel by name, as two tabs of the page would.
describe('WebLockTabGuard', () => {
    test('the first tab finds the level free and holds the lock', async () => {
        const lockName = newLockName();
        const guard = new WebLockTabGuard({ lockName });

        expect(await guard.acquire()).toBe('free');
        expect(await heldLockNames()).toContain(lockName);
    });

    test('a newer tab takes the level: the older one hands it over first, then lets the lock go', async () => {
        const lockName = newLockName();
        const olderTab = new WebLockTabGuard({ lockName });
        const newerTab = new WebLockTabGuard({ lockName });
        const steps: string[] = [];
        await olderTab.acquire();
        olderTab.whenTakenOver(async () => {
            steps.push('older tab saved');
            await Promise.resolve();
        });

        const acquired = await newerTab.acquire();
        steps.push('newer tab has the lock');

        expect(acquired).toBe('takenOver');
        expect(steps).toEqual(['older tab saved', 'newer tab has the lock']);
    });

    test('an older tab that never lets go has the lock stolen, and is told', async () => {
        const lockName = newLockName();
        const olderTab = new WebLockTabGuard({ lockName });
        const newerTab = new WebLockTabGuard({ lockName, handOverWaitMs: 50 });
        let isOlderTabTold = false;
        await olderTab.acquire();
        // A hand-over that never ends, as a hung tab's would.
        olderTab.whenTakenOver(() => {
            isOlderTabTold = true;
            return new Promise<void>(() => undefined);
        });

        const acquired = await newerTab.acquire();

        expect(acquired).toBe('takenOver');
        expect(isOlderTabTold).toBe(true);
        expect(await heldLockNames()).toContain(lockName);
    });

    test('a hand-over that comes before the tab is ready runs once it is given', async () => {
        const lockName = newLockName();
        const olderTab = new WebLockTabGuard({ lockName });
        const newerTab = new WebLockTabGuard({ lockName });
        await olderTab.acquire();
        await newerTab.acquire();
        let handOvers = 0;

        olderTab.whenTakenOver(() => {
            handOvers += 1;
            return Promise.resolve();
        });

        expect(handOvers).toBe(1);
    });

    test('a browser without Web Locks gives the lock', async () => {
        const guard = new WebLockTabGuard({ locks: () => undefined, lockName: newLockName() });

        expect(await guard.acquire()).toBe('free');
    });

    test('a request the browser refuses gives the lock', async () => {
        const refusingLocks = {
            request: () => Promise.reject(new DOMException('Not allowed.', 'SecurityError')),
            query: () => Promise.resolve({}),
        } as unknown as LockManager;
        const guard = new WebLockTabGuard({ locks: () => refusingLocks, lockName: newLockName() });

        expect(await guard.acquire()).toBe('free');
    });
});
