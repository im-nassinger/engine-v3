import type { VariableValue } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';

import { ActionRunner } from '../actions/ActionRunner.ts';
import { checksPass } from '../actions/checksPass.ts';
import type { ActionEffects } from '../actions/ActionEffects.ts';
import type { PlayRun } from '../run/PlayRun.ts';
import type { TickContext, TickPhase } from '../run/TickPhase.ts';
import type { TriggerFiring } from '../triggers/TriggerFiring.ts';
import { triggerOf } from '../triggers/TriggerIndex.ts';

// Triggers setting off triggers in one tick stop after this many rounds, the firings EventPhase listed
// being the first.
const CHAIN_LIMIT = 32;
const LEVEL_START_TICK = 1;

// Runs the firings EventPhase listed, in their order: each trigger's checks, then its actions. The events
// those actions cause in the same tick (a tag running out, a level start trigger switched on during the
// first tick, an entity destroyed, a custom event fired, a variable changed) are heard in a next round, and so
// on, up to 32 rounds; the rest are dropped with one warning.
export class TriggerPhase implements TickPhase {
    run(tick: TickContext) {
        const { run } = tick;
        const chain = new ChainedEvents(run, tick.tick);
        const runner = new ActionRunner(run, chain, tick.tick);
        let round: readonly TriggerFiring[] = run.triggers.listed;

        for (let count = 1; round.length > 0; count++) {
            if (count > CHAIN_LIMIT) {
                run.warnings.warn({ kind: 'chainLimit' });
                return;
            }

            for (const firing of round) {
                runFiring(firing, run, runner, tick.tick);
            }
            round = chain.takeRound();
        }
    }
}

// Repeat is asked again, since an earlier firing of the same trigger this tick may have used it up, and so
// is on/off, which an earlier action may have switched. A trigger with problems never runs. A firing whose
// checks fail doesn't count for Repeat, so a once per run coin waits for the player.
function runFiring(firing: TriggerFiring, run: PlayRun, runner: ActionRunner, tick: number) {
    const { triggers } = run;
    const trigger = triggerOf(firing);
    if (trigger === undefined || !trigger.on) return;
    if (!triggers.repeats.allows(firing.owner, firing.triggerId, trigger.repeat, tick)) return;
    if (!triggers.runnable.canRun(firing.owner, trigger)) return;
    if (!checksPass(trigger.checks, firing, run)) return;

    triggers.repeats.fired(firing.owner, firing.triggerId, tick);
    triggers.fired.push(firing);
    runner.runActions(trigger.actions, firing);
}

// The firings the current round's actions caused, decided when each event happens, in the order they did.
class ChainedEvents implements ActionEffects {
    private readonly run: PlayRun;
    private readonly tick: number;
    private queued: TriggerFiring[] = [];

    constructor(run: PlayRun, tick: number) {
        this.run = run;
        this.tick = tick;
    }

    tagRanOut(tag: string) {
        for (const indexed of this.run.triggers.index.tagLeft) {
            if (indexed.when.kind !== 'tagLeft' || indexed.when.tag !== tag) continue;

            this.queue(this.run.triggers.hear(indexed, null, this.tick));
        }
    }

    // Level start is over after the first tick, so only then does switching one on make it hear it.
    triggerSwitchedOn(owner: Entity, triggerId: number) {
        if (this.tick !== LEVEL_START_TICK) return;

        const indexed = this.run.triggers.index.levelStart.find(
            (candidate) => candidate.owner === owner && candidate.triggerId === triggerId,
        );
        if (indexed === undefined) return;

        this.queue(this.run.triggers.hear(indexed, null, this.tick));
    }

    // The entity is still there for the rest of the tick, so its Destroyed triggers can read and change it.
    destroyed(entity: Entity) {
        for (const indexed of this.run.triggers.index.destroyedTriggersOf(entity)) {
            this.queue(this.run.triggers.hear(indexed, null, this.tick));
        }
    }

    customEventFired(target: Entity, name: string, sender: Entity) {
        for (const indexed of this.run.triggers.index.customTriggersOf(target, name)) {
            this.queue(this.run.triggers.hear(indexed, sender.id, this.tick));
        }
    }

    variableChanged(holder: Entity, name: string, before: VariableValue, after: VariableValue) {
        for (const indexed of this.run.triggers.variables.changed(holder, name, before, after)) {
            this.queue(this.run.triggers.hear(indexed, null, this.tick));
        }
    }

    takeRound() {
        const round = this.queued;
        this.queued = [];

        return round;
    }

    private queue(firing: TriggerFiring | undefined) {
        if (firing === undefined) return;

        this.queued.push(firing);
    }
}
