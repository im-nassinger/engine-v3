import { TriggerComponent } from '../../components/index.ts';
import type { Trigger } from '../../fields/index.ts';
import type { Level } from '../../level/index.ts';

// Every custom event's name used in the level, in a When or a Fire custom event, each once, in A to Z
// order: what the trigger card suggests, as the tags field offers the level's tags.
export class CustomEventNames {
    static of(level: Level) {
        const names = new Set<string>();

        for (const entity of level.entitiesInPanelOrder()) {
            const triggers = entity.getComponent(TriggerComponent)?.get('triggers') ?? [];

            for (const trigger of triggers) {
                for (const name of namesIn(trigger)) {
                    names.add(name);
                }
            }
        }

        return [...names].sort();
    }
}

function namesIn(trigger: Trigger) {
    const names: string[] = [];

    if (trigger.when?.kind === 'custom' && trigger.when.name !== null) {
        names.push(trigger.when.name);
    }
    for (const action of trigger.actions) {
        if (action.kind === 'fire' && action.name !== null) {
            names.push(action.name);
        }
    }

    return names;
}
