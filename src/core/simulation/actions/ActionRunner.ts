import type { Action, Push } from '../../fields/index.ts';
import type { Point } from '../../geometry/index.ts';
import type { Entity } from '../../level/index.ts';

import type { PlayRun } from '../run/PlayRun.ts';
import type { TriggerFiring } from '../triggers/TriggerFiring.ts';

import { PlayValueWriter } from './PlayValueWriter.ts';
import type { ValueChangeEffects } from './PlayValueWriter.ts';
import { targetsOf } from './targetsOf.ts';

const ORIGIN: Point = { x: 0, y: 0 };

// Runs one firing's actions top to bottom, each on each of its targets in Entities viewer order. A target
// that lacks what the action needs is skipped and the others still run; an action with an unset part does
// nothing, though triggerProblems keeps such a trigger from firing at all.
export class ActionRunner {
    private readonly run: PlayRun;
    private readonly tick: number;
    private readonly writer: PlayValueWriter;

    constructor(run: PlayRun, effects: ValueChangeEffects, tick: number) {
        this.run = run;
        this.tick = tick;
        this.writer = new PlayValueWriter(run, effects, tick);
    }

    runActions(actions: readonly Action[], firing: TriggerFiring) {
        for (const action of actions) {
            this.runAction(action, firing);
        }
    }

    private runAction(action: Action, firing: TriggerFiring) {
        switch (action.kind) {
            case 'change': {
                const { value, amount, op } = action;
                if (value === null || amount === null) return;

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
            case 'win':
                this.run.ending.record('won', this.tick);
                return;
            case 'lose':
                this.run.ending.record('lost', this.tick);
                return;
            case 'restart':
                this.run.ending.record('restart', this.tick);
                return;
        }
    }

    // Marked now and removed with everything inside it at the end of the tick, so the actions after it
    // still run. The World and the camera are never destroyed.
    private destroy(target: Entity) {
        const { level } = this.run;
        if (target === level.world || target === level.camera) return;

        this.run.removals.mark(target, 'destroyed');
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
