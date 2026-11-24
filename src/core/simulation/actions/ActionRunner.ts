import type { Action, Target } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';

import type { PlayRun } from '../run/PlayRun.ts';
import { entitiesIn } from '../triggers/entitiesIn.ts';
import { secondsToTicks } from '../triggers/secondsToTicks.ts';
import type { TriggerFiring } from '../triggers/TriggerFiring.ts';

import type { ActionEffects } from './ActionEffects.ts';
import { PlayValueWriter } from './PlayValueWriter.ts';
import { targetsOf } from './targetsOf.ts';

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
                if (action.seconds === null) continue;

                this.wait(firing, at + 1, action.seconds);
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
                    this.writer.change(target, { value, op, amount });
                }
                return;
            }
            case 'destroy':
                for (const target of targetsOf(action.target, firing, this.run)) {
                    this.destroy(target);
                }
                return;
            case 'fire': {
                const { name } = action;
                if (name === null) return;

                for (const hearer of this.hearersOf(action.target, firing)) {
                    this.effects.customEventFired(hearer, name, firing.owner);
                }
                return;
            }
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
    // first, each entity once however many targets hold it.
    private hearersOf(target: Target, firing: TriggerFiring) {
        const hearers = new Set<Entity>();
        for (const top of targetsOf(target, firing, this.run)) {
            for (const entity of entitiesIn(top)) {
                hearers.add(entity);
            }
        }

        return hearers;
    }

    // The rest goes on in whole ticks from now, at least the next tick, keeping `this` and `other`. A
    // trigger already holding 32 waiting runs drops this one, with a warning once per run.
    private wait(firing: TriggerFiring, nextAction: number, seconds: number) {
        const dueTick = this.tick + Math.max(1, secondsToTicks(seconds));
        const { owner, triggerId, when, other } = firing;
        const kept = this.run.triggers.waiting.add({ owner, triggerId, when, other }, nextAction, dueTick);
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
