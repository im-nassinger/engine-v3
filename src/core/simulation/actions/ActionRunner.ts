import type { Action, Push } from '../../fields/index.ts';
import type { Point } from '../../geometry/index.ts';
import type { Entity } from '../../level/index.ts';

import type { PlayRun } from '../run/PlayRun.ts';
import { entitiesIn } from '../triggers/entitiesIn.ts';
import { secondsToTicks } from '../triggers/secondsToTicks.ts';
import type { TriggerFiring } from '../triggers/TriggerFiring.ts';

import type { ActionEffects } from './ActionEffects.ts';
import { PlayValueWriter } from './PlayValueWriter.ts';
import { targetsOf } from './targetsOf.ts';

const ORIGIN: Point = { x: 0, y: 0 };
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
            case 'push': {
                const { push } = action;
                if (push === null) return;

                for (const target of targetsOf(action.target, firing, this.run)) {
                    this.push(target, push, firing.owner);
                }
                return;
            }
            case 'fire': {
                const { name } = action;
                if (name === null) return;

                for (const target of targetsOf(action.target, firing, this.run)) {
                    this.effects.customEventFired(target, name, firing.owner);
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
    // still run, and each entity in it not marked already hears its own Destroyed, parents first, top row
    // first. The World and the camera are never destroyed.
    private destroy(target: Entity) {
        const { level, removals } = this.run;
        if (target === level.world || target === level.camera) return;
        if (removals.goes(target)) return;

        const newlyMarked = entitiesIn(target).filter((entity) => !removals.goes(entity));
        removals.mark(target, 'destroyed');

        for (const entity of newlyMarked) {
            this.effects.destroyed(entity);
        }
    }

    // A kick to the body the entity belongs to, whatever its mass: a vector, or a strength along the line
    // from `this` to the body, away from or towards `this`. A body exactly on `this` has no line and isn't
    // pushed away or towards.
    private push(target: Entity, push: Push, owner: Entity) {
        const bodyEntity = bodyEntityOf(target, this.run);
        if (bodyEntity === undefined) return;

        const body = this.run.bodyMatrices.bodyOf(bodyEntity);
        const pose = this.run.poses.poseOf(bodyEntity.id);
        if (body === undefined || pose === undefined) return;

        const velocity = push.kind === 'by' ? { x: push.x, y: push.y } : this.alongLine(push, owner, pose);
        if (velocity === undefined) return;

        this.run.scene.world.addVelocity(body.handle, velocity);
    }

    private alongLine(push: Push & { readonly kind: 'away' | 'towards' }, owner: Entity, bodyAt: Point) {
        const from = this.run.caches.worldMatrices.matrixOf(owner).apply(ORIGIN);
        const x = bodyAt.x - from.x;
        const y = bodyAt.y - from.y;
        // Not Math.hypot, which IEEE 754 doesn't define exactly, so it may differ between browsers.
        const length = Math.sqrt(x * x + y * y);
        if (length === 0) return undefined;

        const away = push.kind === 'away' ? 1 : -1;
        const scale = (away * push.strength) / length;

        return { x: x * scale, y: y * scale };
    }
}

// The body the entity belongs to: its own, or the nearest one above it.
function bodyEntityOf(entity: Entity, run: PlayRun) {
    for (let current: Entity | undefined = entity; current !== undefined; current = current.parent) {
        if (run.bodyMatrices.bodyOf(current) !== undefined) return current;
    }

    return undefined;
}
