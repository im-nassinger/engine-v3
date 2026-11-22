import type { TickContext, TickPhase } from '../run/TickPhase.ts';
import type { TouchChange } from '../triggers/TouchLedger.ts';
import type { TriggerFiring } from '../triggers/TriggerFiring.ts';
import { triggerOf } from '../triggers/TriggerIndex.ts';
import type { IndexedTrigger } from '../triggers/TriggerIndex.ts';
import type { PlayTriggers } from '../triggers/PlayTriggers.ts';

const LEVEL_START_TICK = 1;

// Lists the tick's firings, in a fixed order: level start (the first tick only), keys and inputs, timers,
// touched, no longer touched, then "no entity with this tag is left" for the tags that ran out last tick.
// Inside each, triggers come in Entities viewer order. A trigger that is off hears nothing, and a firing
// its Repeat already refuses is dropped here.
export class EventPhase implements TickPhase {
    run(tick: TickContext) {
        const { triggers, inputs } = tick.run;
        const listing = new FiringList(triggers, tick.tick);

        triggers.startTick();

        if (tick.tick === LEVEL_START_TICK) {
            listing.addAll(triggers.index.levelStart);
        }

        for (const indexed of triggers.index.keysAndInputs) {
            const when = indexed.when;
            const keyHeard = when.kind === 'key' && when.key !== null && inputs.state.isKey(when.key, when.how);
            const inputHeard =
                when.kind === 'input' && when.input !== null && inputs.state.isInput(when.input, when.how);

            if (keyHeard || inputHeard) {
                listing.add(indexed, null);
            }
        }

        listing.addAll(triggers.timers.due(tick.tick));
        listing.addTouches(triggers.touches.changes.touched, 'touched');
        listing.addTouches(triggers.touches.changes.untouched, 'untouched');

        const runOut = new Set(triggers.tagsRunOutLastTick);
        for (const indexed of triggers.index.tagLeft) {
            const when = indexed.when;
            const tagRanOut = when.kind === 'tagLeft' && when.tag !== null && runOut.has(when.tag);

            if (tagRanOut) {
                listing.add(indexed, null);
            }
        }

        triggers.listed = listing.firings;
    }
}

class FiringList {
    readonly firings: TriggerFiring[] = [];
    private readonly triggers: PlayTriggers;
    private readonly tick: number;

    constructor(triggers: PlayTriggers, tick: number) {
        this.triggers = triggers;
        this.tick = tick;
    }

    addAll(heard: readonly IndexedTrigger[]) {
        for (const indexed of heard) {
            this.add(indexed, null);
        }
    }

    // Each touch is its own firing of every trigger of its owner that hears it.
    addTouches(changes: readonly TouchChange[], kind: 'touched' | 'untouched') {
        for (const change of changes) {
            for (const indexed of this.triggers.index.touchTriggersOf(change.owner)) {
                if (indexed.when.kind !== kind) continue;

                this.add(indexed, change.other);
            }
        }
    }

    add(indexed: IndexedTrigger, other: TriggerFiring['other']) {
        const trigger = triggerOf(indexed);
        if (trigger === undefined || !trigger.on) return;

        const allowed = this.triggers.repeats.allows(indexed.owner, indexed.triggerId, trigger.repeat, this.tick);
        if (!allowed) return;

        this.firings.push({ owner: indexed.owner, triggerId: indexed.triggerId, when: indexed.when, other });
    }
}
