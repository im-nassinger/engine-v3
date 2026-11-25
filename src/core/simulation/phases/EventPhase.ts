import type { TickContext, TickPhase } from '../run/TickPhase.ts';
import type { TouchChange } from '../triggers/TouchLedger.ts';
import type { TriggerFiring } from '../triggers/TriggerFiring.ts';
import type { IndexedTrigger } from '../triggers/TriggerIndex.ts';
import type { PlayTriggers } from '../triggers/PlayTriggers.ts';

const LEVEL_START_TICK = 1;

// Lists the tick's firings, in a fixed order: level start (the first tick only), keys and inputs, timers,
// the waiting runs due this tick (in WaitingRuns' order), then starts touching and stops touching.
// Inside each, triggers come in Entities viewer order. A trigger that is off hears nothing.
export class EventPhase implements TickPhase {
    run(tick: TickContext) {
        const { triggers, inputs } = tick.run;
        const listing = new FiringList(triggers);

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
        listing.addResumed(triggers.waiting.takeDue(tick.tick));
        listing.addTouches(triggers.touches.changes.touched, 'touched');
        listing.addTouches(triggers.touches.changes.untouched, 'untouched');

        triggers.listed = listing.firings;
    }
}

class FiringList {
    readonly firings: TriggerFiring[] = [];
    private readonly triggers: PlayTriggers;

    constructor(triggers: PlayTriggers) {
        this.triggers = triggers;
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

    // A waiting run goes on where it stopped.
    addResumed(due: readonly TriggerFiring[]) {
        this.firings.push(...due);
    }

    add(indexed: IndexedTrigger, other: TriggerFiring['other']) {
        const firing = this.triggers.hear(indexed, other);
        if (firing === undefined) return;

        this.firings.push(firing);
    }
}
