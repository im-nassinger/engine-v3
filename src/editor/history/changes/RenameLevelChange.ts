import type { Level } from '../../../core/entities/index.ts';

import type { LevelChange } from './LevelChange.ts';

// The level's name in the top bar. Both names were accepted before, so a refusal is a bug and throws.
export class RenameLevelChange implements LevelChange {
    private readonly oldName: string;
    private readonly newName: string;

    constructor(oldName: string, newName: string) {
        this.oldName = oldName;
        this.newName = newName;
    }

    apply(level: Level) {
        this.write(level, this.newName);
    }

    revert(level: Level) {
        this.write(level, this.oldName);
    }

    private write(level: Level, name: string) {
        const outcome = level.rename(name);
        if (outcome.renamed) return;

        throw new Error(`The level refused the name "${name}": ${outcome.reason}.`);
    }
}
