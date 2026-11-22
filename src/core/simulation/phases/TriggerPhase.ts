import type { TickContext, TickPhase } from '../run/TickPhase.ts';
import { triggerOf } from '../triggers/TriggerIndex.ts';

// Runs the firings EventPhase listed, in their order. Repeat is asked again for each, since an earlier
// firing of the same trigger this tick may have used it up, and a firing it lets through is recorded.
export class TriggerPhase implements TickPhase {
    run(tick: TickContext) {
        const { triggers } = tick.run;

        for (const firing of triggers.listed) {
            const trigger = triggerOf(firing);
            if (trigger === undefined || !trigger.on) continue;

            const allowed = triggers.repeats.allows(firing.owner, firing.triggerId, trigger.repeat, tick.tick);
            if (!allowed) continue;

            triggers.repeats.fired(firing.owner, firing.triggerId, tick.tick);
            triggers.fired.push(firing);
        }
    }
}
