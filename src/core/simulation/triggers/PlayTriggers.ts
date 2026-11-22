import type { ComponentRegistry } from '../../components/index.ts';
import type { Entity, Level } from '../../level/index.ts';
import type { SensorEvent } from '../../physics/index.ts';

import { entitiesIn } from './entitiesIn.ts';
import { RunnableTriggers } from './RunnableTriggers.ts';
import { TagCounts } from './TagCounts.ts';
import { TouchLedger } from './TouchLedger.ts';
import type { TriggerFiring } from './TriggerFiring.ts';
import { TriggerIndex, triggerOf } from './TriggerIndex.ts';
import type { IndexedTrigger } from './TriggerIndex.ts';
import { TriggerRepeats } from './TriggerRepeats.ts';
import { TriggerTimers } from './TriggerTimers.ts';

// What a run keeps about its triggers between the tick phases: the index of who hears what, the touches,
// the timers, each trigger's last firing, which triggers can run, the tags held, and this tick's firings.
export class PlayTriggers {
    readonly index: TriggerIndex;
    readonly touches: TouchLedger;
    readonly timers: TriggerTimers;
    readonly repeats: TriggerRepeats;
    readonly runnable: RunnableTriggers;
    readonly tags: TagCounts;
    // The firings EventPhase listed this tick, in the events' order.
    listed: readonly TriggerFiring[] = [];
    // The firings whose actions TriggerPhase ran this tick, in the order they ran.
    readonly fired: TriggerFiring[] = [];
    private tagsRunOut: readonly string[] = [];
    private readonly sensorEvents: SensorEvent[] = [];

    constructor(level: Level, registry: ComponentRegistry) {
        this.index = new TriggerIndex(level);
        this.touches = new TouchLedger(level, this.index);
        this.timers = new TriggerTimers(this.index);
        this.repeats = new TriggerRepeats();
        this.runnable = new RunnableTriggers(level, registry);
        this.tags = new TagCounts(level);
    }

    // The tags that ran out last tick, which this tick's "no entity with this tag is left" hears.
    get tagsRunOutLastTick() {
        return this.tagsRunOut;
    }

    // Called by PhysicsPhase after the step, with the world's sensor events.
    readSensorEvents(read: (into: SensorEvent[]) => void) {
        this.sensorEvents.length = 0;
        read(this.sensorEvents);
        this.touches.readStep(this.sensorEvents);
    }

    // The trigger's firing for an event, `other` its cause, or undefined when it doesn't hear it: it is off,
    // or its Repeat refuses a firing this soon.
    hear(indexed: IndexedTrigger, other: TriggerFiring['other'], tick: number): TriggerFiring | undefined {
        const trigger = triggerOf(indexed);
        if (trigger === undefined || !trigger.on) return undefined;

        const allowed = this.repeats.allows(indexed.owner, indexed.triggerId, trigger.repeat, tick);
        if (!allowed) return undefined;

        return { owner: indexed.owner, triggerId: indexed.triggerId, when: indexed.when, other };
    }

    startTick() {
        this.listed = [];
        this.fired.length = 0;
    }

    // Called before the entity and everything inside it leave the level.
    removing(top: Entity) {
        const removedList = entitiesIn(top);
        const removed = new Set(removedList);

        this.tags.forget(removedList);
        this.index.forget(removed);
        this.touches.forget(removed);
        this.timers.forget(removed);
        this.repeats.forget(removed);
        this.runnable.forget(removed);
    }

    // Called by EndOfTickPhase once the tick's removals are done.
    endTick() {
        this.tagsRunOut = this.tags.takeRunOut();
    }
}
