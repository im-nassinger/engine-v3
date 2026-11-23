import type { VariableValue } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';

import type { IndexedTrigger, TriggerIndex } from './TriggerIndex.ts';
import { variableMatches } from './variableMatches.ts';

// Hears every variable PlayValueWriter writes and gives the "a variable changes" triggers it sets off: with no
// condition, any change of value; with one ("becomes 10 or more"), only when it was false before and is true
// now. A value written the same as it was is no change. The World's variables are the level's, heard by the
// triggers of every entity naming them; another entity's are its own, heard only by its own triggers.
export class VariableWatch {
    private readonly index: TriggerIndex;

    constructor(index: TriggerIndex) {
        this.index = index;
    }

    // The triggers set off, in Entities viewer order for the level's variables, top to bottom in the card for
    // an own one.
    changed(holder: Entity, name: string, before: VariableValue, after: VariableValue): readonly IndexedTrigger[] {
        if (before === after) return [];

        const isWorld = holder.parent === undefined;
        const listening = isWorld
            ? this.index.levelVariableTriggersOf(name)
            : this.index.ownVariableTriggersOf(holder, name);

        return listening.filter((indexed) => setsOff(indexed, before, after));
    }
}

function setsOff(indexed: IndexedTrigger, before: VariableValue, after: VariableValue) {
    const { when } = indexed;
    if (when.kind !== 'variableChanged') return false;

    const { becomes } = when;
    if (becomes === null) return true;

    const was = variableMatches(before, becomes.compare, becomes.value);
    const is = variableMatches(after, becomes.compare, becomes.value);

    return !was && is;
}
