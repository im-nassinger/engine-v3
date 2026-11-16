import type { DamagedLevel, LevelStore, SavedLevel, SaveWrite } from '../contracts/LevelStore.ts';

type HeldSave = {
    readonly level: SavedLevel;
    readonly finish: () => void;
};

// A LevelStore for tests. It can refuse loads (storage that can't open), saves and keeping a damaged record, and
// hold each save until the test finishes it, so a test can change the level while a save is running.
export class InMemoryLevelStore implements LevelStore {
    saved: SavedLevel | undefined;
    damaged: DamagedLevel | undefined;
    saveCount = 0;
    refusesLoads = false;
    refusesSaves = false;
    refusesKeepingDamaged = false;
    holdsSaves = false;
    private held: HeldSave[] = [];

    constructor(saved?: SavedLevel) {
        this.saved = saved;
    }

    get heldCount() {
        return this.held.length;
    }

    load() {
        if (this.refusesLoads) return Promise.reject(new Error('The store could not be opened.'));

        return Promise.resolve(this.saved);
    }

    keepDamaged(level: DamagedLevel) {
        if (this.refusesKeepingDamaged) return Promise.reject(new Error('The store refused the damaged record.'));

        this.damaged = level;

        return Promise.resolve();
    }

    save(level: SavedLevel) {
        return new Promise<SaveWrite>((resolve, reject) => {
            const finish = () => {
                if (this.refusesSaves) {
                    reject(new Error('The store refused the save.'));
                    return;
                }

                resolve(this.write(level));
            };

            if (this.holdsSaves) {
                this.held.push({ level, finish });
            } else {
                finish();
            }
        });
    }

    // Finishes the oldest held save.
    finishHeld() {
        const next = this.held.shift();
        if (next === undefined) throw new Error('No save is held.');

        next.finish();
    }

    private write(level: SavedLevel): SaveWrite {
        const write = this.saved === undefined ? 'wroteNew' : 'replaced';
        this.saved = level;
        this.saveCount += 1;

        return write;
    }
}
