import type { ComponentRegistry } from '../../components/index.ts';
import type { Entity, Level } from '../../level/index.ts';
import type { ContactEvent, SensorEvent } from '../../physics/index.ts';

import { entitiesIn } from './entitiesIn.ts';
import { RunnableTriggers } from './RunnableTriggers.ts';
import { TagCounts } from './TagCounts.ts';
import { TouchLedger } from './TouchLedger.ts';
import type { TriggerFiring } from './TriggerFiring.ts';
import { triggerOf } from './TriggerIndex.ts';
import type { IndexedTrigger, TriggerIndex } from './TriggerIndex.ts';
import { TriggerTimers } from './TriggerTimers.ts';
import { VariableWatch } from './VariableWatch.ts';
import { WaitingRuns } from './WaitingRuns.ts';

// What a run keeps about its triggers between the tick phases: the index of who hears what, the touches,
// the timers, which triggers can run, the tags held, who hears which
// variable change, the runs stopped at a Wait, and this tick's firings.
export class PlayTriggers {
    readonly index: TriggerIndex;
    readonly touches: TouchLedger;
    readonly timers: TriggerTimers;
    readonly runnable: RunnableTriggers;
    readonly tags: TagCounts;
    readonly variables: VariableWatch;
    readonly waiting: WaitingRuns;
    // The firings EventPhase listed this tick, in the events' order.
    listed: readonly TriggerFiring[] = [];
    // The firings whose actions TriggerPhase ran this tick, in the order they ran.
    readonly fired: TriggerFiring[] = [];
    private readonly sensorEvents: SensorEvent[] = [];

    // The index is built before the run's physics, which needs its touchSurfaces.
    constructor(level: Level, registry: ComponentRegistry, index: TriggerIndex) {
        this.index = index;
        this.touches = new TouchLedger(level, this.index);
        this.timers = new TriggerTimers(this.index);
        this.runnable = new RunnableTriggers(level, registry);
        this.tags = new TagCounts(level);
        this.variables = new VariableWatch(this.index);
        this.waiting = new WaitingRuns(level);
    }

    // Called by PhysicsPhase after the step, with the world's sensor and contact events.
    readTouches(readSensorEvents: (into: SensorEvent[]) => void, contactEvents: readonly ContactEvent[]) {
        this.sensorEvents.length = 0;
        readSensorEvents(this.sensorEvents);
        this.touches.readStep(this.sensorEvents, contactEvents);
    }

    // The trigger's firing for an event, `other` its cause, or undefined when it doesn't hear it: it is off.
    hear(indexed: IndexedTrigger, other: TriggerFiring['other']): TriggerFiring | undefined {
        const trigger = triggerOf(indexed);
        if (trigger === undefined || !trigger.on) return undefined;

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
        this.runnable.forget(removed);
        this.waiting.forget(removed);
    }
}
