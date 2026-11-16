import type { TabGuard } from '../../../editor/saving/index.ts';

type LockSource = () => LockManager | undefined;

function browserLocks() {
    return navigator.locks as LockManager | undefined;
}

// One tab at a time edits the level: an exclusive Web Lock asked for with ifAvailable, held for the page's life.
// A browser without Web Locks, or one that refuses the request, gives the lock, because a tab that can't tell
// must still be able to edit.
export class WebLockTabGuard implements TabGuard {
    static readonly defaultLockName = 'engine-v3/level';

    private readonly locks: LockSource;
    private readonly lockName: string;

    constructor(options: { locks?: LockSource; lockName?: string } = {}) {
        this.locks = options.locks ?? browserLocks;
        this.lockName = options.lockName ?? WebLockTabGuard.defaultLockName;
    }

    acquire() {
        const locks = this.locks();
        if (locks === undefined) return Promise.resolve(true);

        return new Promise<boolean>((resolve) => {
            const holdForThePagesLife = (lock: Lock | null) => {
                if (lock === null) {
                    resolve(false);
                    return undefined;
                }

                resolve(true);

                return new Promise<never>(() => undefined);
            };

            const request = locks.request(this.lockName, { ifAvailable: true }, holdForThePagesLife);
            request.catch(() => resolve(true));
        });
    }
}
