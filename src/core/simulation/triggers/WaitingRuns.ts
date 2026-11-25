import { TriggerComponent } from '../../components/index.ts';
import type { Entity, Level } from '../../level/index.ts';

import type { TriggerFiring } from './TriggerFiring.ts';

// A trigger holds at most this many waiting runs; another is dropped.
const MOST_PER_TRIGGER = 32;

// One run of a trigger's actions stopped at a Wait: its firing (`this`, `other`), the action it goes on
// from, the tick it is due, and its place in the order runs started.
export type WaitingRun = {
    readonly firing: TriggerFiring;
    readonly nextAction: number;
    readonly dueTick: number;
    readonly started: number;
};

// The runs stopped at a Wait, kept until their tick comes. Due runs go in order of due tick, then trigger
// order (Entities viewer order, then top to bottom in the card), then the order they started. Switching
// a trigger off, or removing its entity, cancels its runs, those due this tick and not yet run too.
export class WaitingRuns {
    private runs: WaitingRun[] = [];
    // The firings takeDue gave this tick, until a cancel takes them out.
    private resuming = new Set<TriggerFiring>();
    private startedCount = 0;
    // Each entity's place in Entities viewer order when the run started; entities don't move in play.
    private readonly places = new Map<Entity, number>();

    constructor(level: Level) {
        for (const entity of level.entitiesInPanelOrder()) {
            this.places.set(entity, this.places.size);
        }
    }

    // Every waiting run, in the order they will resume.
    get all(): readonly WaitingRun[] {
        return this.runs;
    }

    // False, keeping nothing, when the firing's trigger already holds 32 waiting runs.
    add(firing: TriggerFiring, nextAction: number, dueTick: number) {
        const held = this.runs.filter((run) => sameTrigger(run.firing, firing.owner, firing.triggerId)).length;
        if (held >= MOST_PER_TRIGGER) return false;

        this.runs.push({ firing, nextAction, dueTick, started: this.startedCount });
        this.startedCount += 1;
        this.runs.sort((first, second) => this.compare(first, second));

        return true;
    }

    // The runs due on this tick or before, taken out as resumed firings, in the order they resume.
    takeDue(tick: number): readonly TriggerFiring[] {
        const dueCount = this.runs.findIndex((run) => run.dueTick > tick);
        const end = dueCount === -1 ? this.runs.length : dueCount;
        const due = this.runs.slice(0, end).map((run) => ({ ...run.firing, resumesAt: run.nextAction }));
        this.runs = this.runs.slice(end);
        this.resuming = new Set(due);

        return due;
    }

    // False once its trigger was switched off, or its entity removed, after takeDue gave it.
    stillResumes(firing: TriggerFiring) {
        return this.resuming.has(firing);
    }

    cancel(owner: Entity, triggerId: number) {
        this.runs = this.runs.filter((run) => !sameTrigger(run.firing, owner, triggerId));
        this.dropResuming((firing) => sameTrigger(firing, owner, triggerId));
    }

    forget(removed: ReadonlySet<Entity>) {
        this.runs = this.runs.filter((run) => !removed.has(run.firing.owner));
        this.dropResuming((firing) => removed.has(firing.owner));
    }

    private dropResuming(goes: (firing: TriggerFiring) => boolean) {
        for (const firing of [...this.resuming]) {
            if (goes(firing)) {
                this.resuming.delete(firing);
            }
        }
    }

    private compare(first: WaitingRun, second: WaitingRun) {
        if (first.dueTick !== second.dueTick) return first.dueTick - second.dueTick;

        const firstOwner = first.firing.owner;
        const secondOwner = second.firing.owner;
        if (firstOwner !== secondOwner) return this.placeOf(firstOwner) - this.placeOf(secondOwner);

        const firstInCard = placeInCard(firstOwner, first.firing.triggerId);
        const secondInCard = placeInCard(secondOwner, second.firing.triggerId);
        if (firstInCard !== secondInCard) return firstInCard - secondInCard;

        return first.started - second.started;
    }

    private placeOf(entity: Entity) {
        return this.places.get(entity) ?? Number.POSITIVE_INFINITY;
    }
}

function sameTrigger(firing: TriggerFiring, owner: Entity, triggerId: number) {
    return firing.owner === owner && firing.triggerId === triggerId;
}

function placeInCard(owner: Entity, triggerId: number) {
    const triggers = owner.getComponent(TriggerComponent)?.get('triggers') ?? [];

    return triggers.findIndex((trigger) => trigger.id === triggerId);
}
