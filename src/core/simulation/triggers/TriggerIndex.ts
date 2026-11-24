import { ShapeComponent, SurfaceComponent, TriggerComponent } from '../../components/index.ts';
import type { EntityId, Trigger, When } from '../../fields/index.ts';
import type { Entity, Level } from '../../level/index.ts';
import type { TouchSurfaces } from '../../physics/index.ts';

// One trigger as the index lists it. Its When never changes in play, so it is read once; its on/off does,
// so that is read from the component when it is needed (triggerOf).
export type IndexedTrigger = {
    readonly owner: Entity;
    readonly triggerId: number;
    readonly when: When;
};

// The run's triggers by the kind of event they hear, each list in Entities viewer order, built when the run
// starts and kept as entities are removed, so no tick walks every trigger. A When with an unset part hears
// nothing and isn't listed. Touch triggers are found from their entity, custom event
// triggers from their name and then their entity, "a variable changes" triggers from the level's variable's
// name, or from their entity and then their own variable's name.
export class TriggerIndex {
    private readonly level: Level;
    private levelStartList: IndexedTrigger[] = [];
    private keysAndInputsList: IndexedTrigger[] = [];
    private timersList: IndexedTrigger[] = [];
    private readonly touchByOwner = new Map<Entity, IndexedTrigger[]>();
    // Each touch owner's place in Entities viewer order, to sort touches.
    private readonly touchPlace = new Map<Entity, number>();
    private readonly customByName = new Map<string, Map<Entity, IndexedTrigger[]>>();
    private readonly levelVariableByName = new Map<string, IndexedTrigger[]>();
    private readonly ownVariableByOwner = new Map<Entity, IndexedTrigger[]>();

    constructor(level: Level) {
        this.level = level;

        for (const owner of level.entitiesInPanelOrder()) {
            const triggers = owner.getComponent(TriggerComponent)?.get('triggers') ?? [];

            for (const trigger of triggers) {
                this.add(owner, trigger);
            }
        }
    }

    get levelStart(): readonly IndexedTrigger[] {
        return this.levelStartList;
    }

    get keysAndInputs(): readonly IndexedTrigger[] {
        return this.keysAndInputsList;
    }

    get timers(): readonly IndexedTrigger[] {
        return this.timersList;
    }

    hearsTouch(entity: Entity) {
        return this.touchByOwner.has(entity);
    }

    // The entity's touched and no longer touched triggers, top to bottom in its card.
    touchTriggersOf(owner: Entity): readonly IndexedTrigger[] {
        return this.touchByOwner.get(owner) ?? [];
    }

    // Where a touch owner sits in Entities viewer order; an entity that hears no touch has no place.
    touchPlaceOf(owner: Entity) {
        return this.touchPlace.get(owner) ?? Number.POSITIVE_INFINITY;
    }

    // The entity's triggers hearing the custom event of this name, top to bottom in its card. A name nobody
    // hears is one lookup.
    customTriggersOf(owner: Entity, name: string): readonly IndexedTrigger[] {
        return this.customByName.get(name)?.get(owner) ?? [];
    }

    // The triggers on any entity hearing the level's variable of this name change, in Entities viewer order.
    levelVariableTriggersOf(name: string): readonly IndexedTrigger[] {
        return this.levelVariableByName.get(name) ?? [];
    }

    // The entity's triggers hearing its own variable of this name change, top to bottom in its card.
    ownVariableTriggersOf(owner: Entity, name: string): readonly IndexedTrigger[] {
        const ownTriggers = this.ownVariableByOwner.get(owner) ?? [];

        return ownTriggers.filter((indexed) => variableNameOf(indexed.when) === name);
    }

    // What physics must build for the touch triggers, read when the run starts, before its physics is
    // built; triggers can't be added in play. Each entity with a shape whose entity, or a group above it,
    // hears touches: a solid one (with a SurfaceComponent) sends contact events, and one with no
    // SurfaceComponent is built as a sensor.
    touchSurfaces(): TouchSurfaces {
        const contactEvents = new Set<EntityId>();
        const sensors = new Set<EntityId>();
        if (this.touchByOwner.size === 0) return { contactEvents, sensors };

        for (const entity of this.level.entitiesInPanelOrder()) {
            if (!entity.hasComponent(ShapeComponent)) continue;
            if (!this.hearsTouchAtOrAbove(entity)) continue;

            if (entity.hasComponent(SurfaceComponent)) {
                contactEvents.add(entity.id);
            } else {
                sensors.add(entity.id);
            }
        }

        return { contactEvents, sensors };
    }

    // The removed entities' triggers hear nothing more.
    forget(removed: ReadonlySet<Entity>) {
        const stays = (indexed: IndexedTrigger) => !removed.has(indexed.owner);

        this.levelStartList = this.levelStartList.filter(stays);
        this.keysAndInputsList = this.keysAndInputsList.filter(stays);
        this.timersList = this.timersList.filter(stays);

        for (const entity of removed) {
            this.touchByOwner.delete(entity);
            this.touchPlace.delete(entity);

            this.ownVariableByOwner.delete(entity);

            for (const byOwner of this.customByName.values()) {
                byOwner.delete(entity);
            }
        }

        for (const [name, listening] of this.levelVariableByName) {
            this.levelVariableByName.set(name, listening.filter(stays));
        }
    }

    private add(owner: Entity, trigger: Trigger) {
        const when = trigger.when;
        if (when === null || !isWhenSet(when)) return;

        const indexed = { owner, triggerId: trigger.id, when };

        switch (when.kind) {
            case 'levelStart':
                this.levelStartList.push(indexed);
                return;
            case 'key':
            case 'input':
                this.keysAndInputsList.push(indexed);
                return;
            case 'after':
            case 'every':
                this.timersList.push(indexed);
                return;
            case 'touched':
            case 'untouched':
                addByOwner(this.touchByOwner, this.touchPlace, indexed);
                return;
            case 'custom':
                if (when.name === null) return;
                addTo(this.customOwnersOf(when.name), indexed);
                return;
            case 'variableChanged':
                this.addVariableChanged(indexed, when);
                return;
        }
    }

    // The World's own variables are the level's, so a World trigger naming one as its own hears it as the
    // level's.
    private addVariableChanged(indexed: IndexedTrigger, when: VariableChangedWhen) {
        const { variable } = when;
        if (variable === null) return;

        const isWorld = indexed.owner === this.level.world;
        if (variable.owner === 'own' && !isWorld) {
            addTo(this.ownVariableByOwner, indexed);
            return;
        }

        const listening = this.levelVariableByName.get(variable.name);
        if (listening !== undefined) {
            listening.push(indexed);
            return;
        }

        this.levelVariableByName.set(variable.name, [indexed]);
    }

    private customOwnersOf(name: string) {
        const found = this.customByName.get(name);
        if (found !== undefined) return found;

        const byOwner = new Map<Entity, IndexedTrigger[]>();
        this.customByName.set(name, byOwner);

        return byOwner;
    }

    private hearsTouchAtOrAbove(entity: Entity) {
        for (let current: Entity | undefined = entity; current !== undefined; current = current.parent) {
            if (this.hearsTouch(current)) return true;
        }

        return false;
    }
}

type VariableChangedWhen = When & { readonly kind: 'variableChanged' };

function variableNameOf(when: When) {
    return when.kind === 'variableChanged' ? when.variable?.name : undefined;
}

function addTo(byOwner: Map<Entity, IndexedTrigger[]>, indexed: IndexedTrigger) {
    const ownTriggers = byOwner.get(indexed.owner);
    if (ownTriggers !== undefined) {
        ownTriggers.push(indexed);
        return;
    }

    byOwner.set(indexed.owner, [indexed]);
}

function addByOwner(byOwner: Map<Entity, IndexedTrigger[]>, places: Map<Entity, number>, indexed: IndexedTrigger) {
    if (!places.has(indexed.owner)) {
        places.set(indexed.owner, places.size);
    }

    addTo(byOwner, indexed);
}

// The trigger now, as its component holds it, or undefined once it is gone.
export function triggerOf(indexed: IndexedTrigger) {
    const triggers = indexed.owner.getComponent(TriggerComponent)?.get('triggers') ?? [];

    return triggers.find((trigger) => trigger.id === indexed.triggerId);
}

function isWhenSet(when: When) {
    switch (when.kind) {
        case 'key':
            return when.key !== null;
        case 'input':
            return when.input !== null;
        case 'after':
        case 'every':
            return when.seconds !== null;
        case 'custom':
            return when.name !== null;
        case 'variableChanged':
            return when.variable !== null;
        default:
            return true;
    }
}
