import type { LevelStore, SavedLevel, SaveWrite } from '../contracts/LevelStore.ts';

type HeldSave = {
    readonly level: SavedLevel;
    readonly finish: () => void;
};

// A LevelStore for tests. It can refuse saves, and hold each save until the test finishes it, so a test can
// change the level while a save is running.
export class InMemoryLevelStore implements LevelStore {
    saved: SavedLevel | undefined;
    saveCount = 0;
    refusesSaves = false;
    holdsSaves = false;
    private held: HeldSave[] = [];

    constructor(saved?: SavedLevel) {
        this.saved = saved;
    }

    get heldCount() {
        return this.held.length;
    }

    load() {
        return Promise.resolve(this.saved);
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
