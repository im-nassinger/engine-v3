import type { ComponentRegistry } from '../../components/index.ts';
import type { Trigger } from '../../fields/index.ts';
import type { Entity, Level } from '../../level/index.ts';
import { triggerCanRun, triggerProblems } from '../../triggers/index.ts';

import { TriggerKeys } from './TriggerKeys.ts';

// Whether each trigger can run, from the same triggerProblems the Entity inspector shows: one with an unset
// part, an unknown variable, input or value never runs. Only its on/off changes in play, and a missing
// entity only skips its own part, so the answer is worked out once per trigger, the first time it fires.
export class RunnableTriggers {
    private readonly level: Level;
    private readonly registry: ComponentRegistry;
    private readonly canRunByTrigger = new TriggerKeys<boolean>();

    constructor(level: Level, registry: ComponentRegistry) {
        this.level = level;
        this.registry = registry;
    }

    canRun(owner: Entity, trigger: Trigger) {
        const known = this.canRunByTrigger.get(owner, trigger.id);
        if (known !== undefined) return known;

        const problems = triggerProblems(trigger, { owner, level: this.level, registry: this.registry });
        const canRun = triggerCanRun(problems);
        this.canRunByTrigger.set(owner, trigger.id, canRun);

        return canRun;
    }

    forget(removed: ReadonlySet<Entity>) {
        this.canRunByTrigger.forget(removed);
    }
}
