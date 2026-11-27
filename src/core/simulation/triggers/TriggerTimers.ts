import type { Entity } from '../../level/index.ts';

import { secondsToTicks } from './secondsToTicks.ts';
import { TriggerKeys } from './TriggerKeys.ts';
import { triggerOf } from './TriggerIndex.ts';
import type { IndexedTrigger, TriggerIndex } from './TriggerIndex.ts';

// The tick each timer trigger was switched on, the run's start (tick 0) for one on from the start. "After
// 60 s" is due 3,600 ticks later, "every 2 s" every 120 ticks from then. A timer counts whole ticks, so it
// slows down and stops with the game speed; it stops counting while its trigger is off and starts again
// from 0 when switched on. A time of 0 s is due on the next tick.
export class TriggerTimers {
    private readonly index: TriggerIndex;
    private readonly startedAt = new TriggerKeys<number>();

    constructor(index: TriggerIndex) {
        this.index = index;

        for (const timer of index.timers) {
            if (triggerOf(timer)?.on !== true) continue;

            this.startedAt.set(timer.owner, timer.triggerId, 0);
        }
    }

    switchedOn(owner: Entity, triggerId: number, tick: number) {
        this.startedAt.set(owner, triggerId, tick);
    }

    switchedOff(owner: Entity, triggerId: number) {
        this.startedAt.delete(owner, triggerId);
    }

    // The timers due on this tick, in Entities viewer order.
    due(tick: number) {
        return this.index.timers.filter((timer) => this.isDue(timer, tick));
    }

    forget(removed: ReadonlySet<Entity>) {
        this.startedAt.forget(removed);
    }

    private isDue(timer: IndexedTrigger, tick: number) {
        const startTick = this.startedAt.get(timer.owner, timer.triggerId);
        if (startTick === undefined) return false;
        if (timer.when.kind !== 'after' && timer.when.kind !== 'every') return false;
        const { time, unit } = timer.when;
        if (time === null) return false;

        const ticks = unit === 'ticks' ? Math.round(time) : secondsToTicks(time);
        const interval = Math.max(1, ticks);
        const elapsed = tick - startTick;
        if (elapsed <= 0) return false;

        if (timer.when.kind === 'after') return elapsed === interval;

        return elapsed % interval === 0;
    }
}
