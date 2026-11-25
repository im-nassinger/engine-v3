import { MAX_WAIT_SECONDS } from '../../fields/index.ts';
import type { Action, VariableAmount } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';

import type { PlayRun } from '../run/PlayRun.ts';
import { entitiesIn } from '../triggers/entitiesIn.ts';
import { secondsToTicks } from '../triggers/secondsToTicks.ts';
import type { TriggerFiring } from '../triggers/TriggerFiring.ts';

import type { ActionEffects } from './ActionEffects.ts';
import { amountNow } from './amountNow.ts';
import { PlayValueWriter } from './PlayValueWriter.ts';
import { targetsOf } from './targetsOf.ts';

type FireAction = Action & { readonly kind: 'fire' };

// The ticks of a run's first second, 1 to 60.
const RESTART_GUARD_TICKS = 60;

// Runs one firing's actions top to bottom, each on each of its targets in Entities viewer order, until a
// Wait, which hands the rest to WaitingRuns. A target that lacks what the action needs is skipped and the
// others still run; an action with an unset part does nothing, though triggerProblems keeps such a trigger
// from firing at all.
export class ActionRunner {
    private readonly run: PlayRun;
    private readonly tick: number;
    private readonly effects: ActionEffects;
    private readonly writer: PlayValueWriter;

    constructor(run: PlayRun, effects: ActionEffects, tick: number) {
        this.run = run;
        this.effects = effects;
        this.tick = tick;
        this.writer = new PlayValueWriter(run, effects, tick);
    }

    // From the action at `from`, 0 for a new firing.
    runActions(actions: readonly Action[], firing: TriggerFiring, from = 0) {
        for (let at = from; at < actions.length; at++) {
            const action = actions[at];
            if (action === undefined) return;

            if (action.kind === 'wait') {
                const seconds = this.secondsOf(action.seconds, firing);
                if (seconds === undefined) continue;

                this.wait(firing, at + 1, seconds);
                return;
            }
            this.runAction(action, firing);
        }
    }

    private runAction(action: Action, firing: TriggerFiring) {
        switch (action.kind) {
            case 'change': {
                const { value, amount, op } = action;
                // Flip is the one op that needs no amount.
                if (value === null || (amount === null && op !== 'flip')) return;

                for (const target of targetsOf(action.target, firing, this.run)) {
                    // A variable is read on each target as the change reaches it, so an earlier target's
                    // change is seen; a target lacking an own variable is skipped.
                    const amountHere = amount === null ? null : amountNow(amount, target, this.run);
                    if (amountHere === undefined) continue;

                    this.writer.change(target, { value, op, amount: amountHere });
                }
                return;
            }
            case 'destroy':
                for (const target of targetsOf(action.target, firing, this.run)) {
                    this.destroy(target);
                }
                return;
            case 'fire':
                this.fire(action, firing);
                return;
            case 'wait':
                // runActions stops at a Wait.
                return;
            case 'win':
                this.run.ending.record('won', this.tick);
                return;
            case 'lose':
                this.run.ending.record('lost', this.tick);
                return;
            case 'restart':
                this.restart();
                return;
        }
    }

    // A custom event goes down the tree: each target and everything inside it, parents first, top row
    // first, each entity once however many targets hold it, with the number its target gave. A variable as
    // the number is read on each target now; a target that lacks it, or holds no number there, is skipped.
    private fire(action: FireAction, firing: TriggerFiring) {
        const { name, amount } = action;
        if (name === null) return;

        const heard = new Set<Entity>();
        for (const top of targetsOf(action.target, firing, this.run)) {
            const number = amount === null ? null : amountNow(amount, top, this.run);
            if (number !== null && typeof number !== 'number') continue;

            for (const hearer of entitiesIn(top)) {
                if (heard.has(hearer)) continue;

                heard.add(hearer);
                this.effects.customEventFired(hearer, name, firing.owner, number);
            }
        }
    }

    // A Wait's seconds, a variable read on the World or on `this` now and kept to 0 to an hour as a typed
    // one is; undefined when the variable is missing or isn't a number, and the Wait is skipped.
    private secondsOf(seconds: number | VariableAmount | null, firing: TriggerFiring) {
        if (seconds === null) return undefined;

        const now = amountNow(seconds, firing.owner, this.run);
        if (typeof now !== 'number') return undefined;

        return Math.min(Math.max(now, 0), MAX_WAIT_SECONDS);
    }

    // The rest goes on in whole ticks from now, at least the next tick, keeping `this` and `other`. A
    // trigger already holding 32 waiting runs drops this one, with a warning once per run.
    private wait(firing: TriggerFiring, nextAction: number, seconds: number) {
        const dueTick = this.tick + Math.max(1, secondsToTicks(seconds));
        const { owner, triggerId, when, other, number } = firing;
        const kept = this.run.triggers.waiting.add({ owner, triggerId, when, other, number }, nextAction, dueTick);
        if (kept) return;

        this.run.warnings.warn({ kind: 'tooManyWaitingRuns' });
    }

    // Ignored in the run's first second, with a warning, so a level start trigger that restarts can't
    // rebuild the level every tick.
    private restart() {
        if (this.tick <= RESTART_GUARD_TICKS) {
            this.run.warnings.warn({ kind: 'restartIgnored' });
            return;
        }

        this.run.ending.record('restart', this.tick);
    }

    // Marked now and removed with everything inside it at the end of the tick, so the actions after it
    // still run. The World and the camera are never destroyed.
    private destroy(target: Entity) {
        const { level, removals } = this.run;
        if (target === level.world || target === level.camera) return;
        if (removals.goes(target)) return;

        removals.mark(target, 'destroyed');
    }
}
