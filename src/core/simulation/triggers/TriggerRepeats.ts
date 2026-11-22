import type { Repeat } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';

import { secondsToTicks } from './secondsToTicks.ts';
import { TriggerKeys } from './TriggerKeys.ts';

// The tick of each trigger's last firing this run, for its Repeat: once per run fires once, at most every
// N s fires again only N s of ticks after the last. A firing that comes too soon is dropped, not queued.
export class TriggerRepeats {
    private readonly lastFired = new TriggerKeys<number>();

    allows(owner: Entity, triggerId: number, repeat: Repeat, tick: number) {
        const lastTick = this.lastFired.get(owner, triggerId);
        if (lastTick === undefined) return true;

        switch (repeat.kind) {
            case 'everyTime':
                return true;
            case 'oncePerRun':
                return false;
            case 'atMostEvery': {
                const waitTicks = secondsToTicks(repeat.seconds);

                return tick - lastTick >= waitTicks;
            }
        }
    }

    fired(owner: Entity, triggerId: number, tick: number) {
        this.lastFired.set(owner, triggerId, tick);
    }

    forget(removed: ReadonlySet<Entity>) {
        this.lastFired.forget(removed);
    }
}
