import type { Acquired, HandOver, TabGuard } from '../../../editor/saving/index.ts';

type LockSource = () => LockManager | undefined;

type WebLockTabGuardOptions = {
    readonly locks?: LockSource;
    readonly lockName?: string;
    readonly handOverWaitMs?: number;
};

const TAKE_LEVEL_MESSAGE = 'takeLevel';

function browserLocks() {
    return navigator.locks as LockManager | undefined;
}

// The newest tab edits the level: an exclusive Web Lock held for the page's life, and a BroadcastChannel of
// the same name. A tab that finds the lock held asks for it on the channel; the tab holding it saves, becomes
// read-only and lets the lock go. One that hasn't let go within handOverWaitMs, a hung or frozen tab, has
// it stolen. A browser without Web Locks, or one that refuses the request, gives the lock, because a tab that
// can't tell must still be able to edit.
export class WebLockTabGuard implements TabGuard {
    static readonly defaultLockName = 'engine-v3/level';
    static readonly defaultHandOverWaitMs = 3_000;

    private readonly locks: LockSource;
    private readonly lockName: string;
    private readonly handOverWaitMs: number;
    private channel: BroadcastChannel | undefined;
    private releaseLock: (() => void) | undefined;
    private handOver: HandOver | undefined;
    private isTakenOver = false;

    constructor(options: WebLockTabGuardOptions = {}) {
        this.locks = options.locks ?? browserLocks;
        this.lockName = options.lockName ?? WebLockTabGuard.defaultLockName;
        this.handOverWaitMs = options.handOverWaitMs ?? WebLockTabGuard.defaultHandOverWaitMs;
    }

    async acquire(): Promise<Acquired> {
        const locks = this.locks();
        if (locks === undefined) return 'free';

        try {
            const acquired = await this.takeLock(locks);
            this.listenForNewerTabs();

            return acquired;
        } catch {
            return 'free';
        }
    }

    whenTakenOver(handOver: HandOver) {
        this.handOver = handOver;
        if (this.isTakenOver) {
            void handOver();
        }
    }

    private async takeLock(locks: LockManager): Promise<Acquired> {
        const isFree = await this.requestLock(locks, { ifAvailable: true });
        if (isFree) return 'free';

        this.askForTheLevel();
        const waitSignal = AbortSignal.timeout(this.handOverWaitMs);
        const isHandedOver = await this.requestLock(locks, { signal: waitSignal });
        if (!isHandedOver) {
            await this.requestLock(locks, { steal: true });
        }

        return 'takenOver';
    }

    // Resolves true once the lock is held, false when it isn't given (ifAvailable) or the wait ran out.
    private requestLock(locks: LockManager, options: LockOptions) {
        return new Promise<boolean>((resolve, reject) => {
            let isGranted = false;

            const holdForThePagesLife = (lock: Lock | null) => {
                if (lock === null) {
                    resolve(false);
                    return undefined;
                }

                isGranted = true;
                resolve(true);

                return new Promise<void>((release) => {
                    this.releaseLock = release;
                });
            };

            const request = locks.request(this.lockName, options, holdForThePagesLife);
            request.catch((error: unknown) => {
                // A held lock's request fails only when a newer tab stole it.
                if (isGranted) {
                    void this.giveUpTheLevel();
                    return;
                }

                if (options.signal?.aborted === true) {
                    resolve(false);
                    return;
                }

                reject(new Error('The browser refused the lock.', { cause: error }));
            });
        });
    }

    private askForTheLevel() {
        const channel = new BroadcastChannel(this.lockName);
        channel.postMessage(TAKE_LEVEL_MESSAGE);
        channel.close();
    }

    private listenForNewerTabs() {
        const channel = new BroadcastChannel(this.lockName);
        channel.onmessage = (event: MessageEvent) => {
            if (event.data !== TAKE_LEVEL_MESSAGE) return;

            void this.giveUpTheLevel();
        };
        this.channel = channel;
    }

    // The lock is let go even when the hand-over fails, so the newer tab never waits for the steal.
    private async giveUpTheLevel() {
        if (this.isTakenOver) return;

        this.isTakenOver = true;
        this.channel?.close();
        this.channel = undefined;

        try {
            await this.handOver?.();
        } finally {
            this.releaseLock?.();
            this.releaseLock = undefined;
        }
    }
}
