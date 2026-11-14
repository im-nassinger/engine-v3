import type { AnyComponent, ComponentClass, ComponentTypeName } from '../components/index.ts';
import { Signal } from '../events/index.ts';
import type { Unsubscribe } from '../events/index.ts';
import type { EntityId } from '../fields/index.ts';

import type { AddComponentOutcome } from './AddComponentOutcome.ts';
import type { EntityChange } from './EntityChange.ts';
import type { LevelTree } from './LevelTree.ts';

type HeldComponent = {
    readonly component: AnyComponent;
    readonly unsubscribe: Unsubscribe;
};

// An id, its components and its own hidden and locked switches. What it is comes from its components.
export class Entity {
    readonly id: EntityId;
    readonly changed = new Signal<EntityChange>();
    private readonly tree: LevelTree<Entity>;
    private readonly heldByType = new Map<ComponentTypeName, HeldComponent>();
    private hiddenSwitch = false;
    private lockedSwitch = false;

    // Only Level constructs entities.
    constructor(id: EntityId, tree: LevelTree<Entity>) {
        this.id = id;
        this.tree = tree;
    }

    get parent() {
        return this.tree.parentOf(this);
    }

    // Entities panel order, index 0 is the top row.
    get children() {
        return this.tree.childrenOf(this);
    }

    get depth() {
        return this.tree.depthOf(this);
    }

    isAncestorOf(entity: Entity) {
        return this.tree.isAncestorOf(this, entity);
    }

    // Its own eye, not its parents'.
    get isHidden() {
        return this.hiddenSwitch;
    }

    setHidden(isHidden: boolean) {
        if (this.hiddenSwitch === isHidden) return;

        this.hiddenSwitch = isHidden;
        this.changed.emit({ kind: 'switchChanged', switchName: 'hidden' });
    }

    get isLocked() {
        return this.lockedSwitch;
    }

    setLocked(isLocked: boolean) {
        if (this.lockedSwitch === isLocked) return;

        this.lockedSwitch = isLocked;
        this.changed.emit({ kind: 'switchChanged', switchName: 'locked' });
    }

    // In the fixed card order.
    get components() {
        const components: AnyComponent[] = [];

        for (const held of this.heldByType.values()) {
            components.push(held.component);
        }

        components.sort((first, second) => first.schema.cardOrder - second.schema.cardOrder);

        return components;
    }

    getComponent<T extends AnyComponent>(componentClass: ComponentClass<T>) {
        const held = this.heldByType.get(componentClass.schema.typeName);
        if (held === undefined) return undefined;
        if (!(held.component instanceof componentClass)) return undefined;

        return held.component;
    }

    requireComponent<T extends AnyComponent>(componentClass: ComponentClass<T>) {
        const component = this.getComponent(componentClass);
        if (component === undefined) {
            throw new Error(`Entity ${this.id} has no ${componentClass.schema.typeName}.`);
        }

        return component;
    }

    hasComponent(componentClass: ComponentClass<AnyComponent>) {
        return this.heldByType.has(componentClass.schema.typeName);
    }

    addComponent(component: AnyComponent): AddComponentOutcome {
        const typeName = component.schema.typeName;
        if (this.heldByType.has(typeName)) return { added: false, reason: 'alreadyHas' };

        const unsubscribe = component.changed.subscribe((change) => {
            this.changed.emit({ kind: 'valueChanged', component, key: change.key });
        });
        this.heldByType.set(typeName, { component, unsubscribe });
        this.changed.emit({ kind: 'componentAdded', component });

        return { added: true };
    }

    removeComponent<T extends AnyComponent>(componentClass: ComponentClass<T>) {
        const component = this.getComponent(componentClass);
        if (component === undefined) return undefined;

        const typeName = componentClass.schema.typeName;
        const held = this.heldByType.get(typeName);
        held?.unsubscribe();
        this.heldByType.delete(typeName);
        this.changed.emit({ kind: 'componentRemoved', component });

        return component;
    }
}
