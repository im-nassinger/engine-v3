import { labelName } from '../../../core/level/index.ts';
import type { Level } from '../../../core/level/index.ts';

// Names a new entity with a word and a number: one more than the highest number already used with that
// word in the level, so "Group 3" follows "Group 2" even after "Group 1" was deleted. A namer also counts the
// names it gave, so a paste of "Box 1" and "Box 2" names them "Box 3" and "Box 4". Group, createShape,
// placeJoint, paste and Duplicate use it.
export class EntityNamer {
    private readonly level: Level;
    private readonly givenNumbers = new Map<string, number>();

    constructor(level: Level) {
        this.level = level;
    }

    nextName(word: string) {
        const highestInLevel = this.highestNumberUsed(word);
        const highestGiven = this.givenNumbers.get(word) ?? 0;
        const next = Math.max(highestInLevel, highestGiven) + 1;
        this.givenNumbers.set(word, next);

        return `${word} ${next}`;
    }

    private highestNumberUsed(word: string) {
        const prefix = `${word} `;
        let highest = 0;

        for (const entity of this.level.entitiesInPanelOrder()) {
            const name = labelName(entity);
            if (!name.startsWith(prefix)) continue;

            const numberText = name.slice(prefix.length);
            const isWholeNumber = /^[0-9]+$/.test(numberText);
            if (!isWholeNumber) continue;

            const usedNumber = Number(numberText);
            highest = Math.max(highest, usedNumber);
        }

        return highest;
    }
}
