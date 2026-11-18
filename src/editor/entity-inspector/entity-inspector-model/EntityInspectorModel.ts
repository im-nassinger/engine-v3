import { BodyComponent } from '../../../core/components/index.ts';
import type { ComponentRegistry } from '../../../core/components/index.ts';
import type { DerivedCaches } from '../../../core/derived/index.ts';
import { VersionCounter } from '../../../core/events/index.ts';
import type { Unsubscribe } from '../../../core/events/index.ts';
import type { Entity, EntityId, Level, LevelUpdate } from '../../../core/level/index.ts';
import type { EditorMessages } from '../../messages/index.ts';
import type { Selection } from '../../selection/index.ts';

import { addableComponents } from '../cards/addableComponents.ts';
import { cardModels } from '../cards/cardModels.ts';
import { entityInspectorHeader } from '../cards/entityInspectorHeader.ts';
import type { CardFolds } from '../folds/CardFolds.ts';
import type { AddableComponent } from '../model/AddableComponent.ts';
import type { CardModel } from '../model/CardModel.ts';
import type { EntityInspectorHeader } from '../model/EntityInspectorHeader.ts';

export type EntityInspectorModelSources = {
    readonly level: Level;
    readonly selection: Selection;
    readonly caches: DerivedCaches;
    readonly registry: ComponentRegistry;
    readonly folds: CardFolds;
    readonly messages: EditorMessages;
};

type Built = {
    readonly atVersion: number;
    readonly header: EntityInspectorHeader;
    readonly cards: readonly CardModel[];
    readonly addable: readonly AddableComponent[];
};

// What the Entity inspector shows: the selected entities, or the World when nothing is selected. Worked out only
// from the field schemas, so a new component needs no Entity inspector code. Built when read after a change.
export class EntityInspectorModel {
    // Moves with the selection, the folds, the shown entities' messages, and any change that can alter what
    // is shown.
    readonly version = new VersionCounter();
    private readonly sources: EntityInspectorModelSources;
    private readonly unsubscribers: readonly Unsubscribe[];
    private built: Built | undefined;
    // Sets for telling quickly whether a change touches what is shown: the shown entities, those with a
    // BodyComponent, and every entity above those, since a body's Mass and merging depend on what is under
    // and above it. Rebuilt when the selection, the tree or a BodyComponent changes.
    private shownSet: ReadonlySet<Entity> | undefined;
    private shownBodies: ReadonlySet<Entity> | undefined;
    private aboveShownBodies: ReadonlySet<Entity> | undefined;

    constructor(sources: EntityInspectorModelSources) {
        this.sources = sources;

        const markChanged = () => this.markChanged();
        const unsubscribeSelection = sources.selection.version.subscribe(markChanged);
        const unsubscribeFolds = sources.folds.version.subscribe(markChanged);
        const unsubscribeUpdates = sources.level.signals.updated.subscribe((update) => this.follow(update));
        const unsubscribeMessages = sources.messages.changed.subscribe((ids) => this.followMessages(ids));
        this.unsubscribers = [unsubscribeSelection, unsubscribeFolds, unsubscribeUpdates, unsubscribeMessages];
    }

    get shownEntities(): readonly Entity[] {
        const { selection, level } = this.sources;
        if (selection.isEmpty) return [level.world];

        return selection.entities;
    }

    get header() {
        return this.build().header;
    }

    // In the fixed card order.
    get cards() {
        return this.build().cards;
    }

    get addableComponents() {
        return this.build().addable;
    }

    dispose() {
        for (const unsubscribe of this.unsubscribers) {
            unsubscribe();
        }
    }

    private build() {
        const atVersion = this.version.version;
        if (this.built?.atVersion === atVersion) return this.built;

        const entities = this.shownEntities;
        const { folds, caches, registry, messages } = this.sources;
        const header = entityInspectorHeader(entities);
        const cards = cardModels(entities, { folds, caches, messages });
        const addable = addableComponents(entities, registry);
        this.built = { atVersion, header, cards, addable };

        return this.built;
    }

    private markChanged() {
        this.shownSet = undefined;
        this.shownBodies = undefined;
        this.aboveShownBodies = undefined;
        this.version.increment();
    }

    private follow(update: LevelUpdate) {
        switch (update.kind) {
            // Rare next to value changes, and any of them can change what merges into a shown body.
            case 'entityAdded':
            case 'entityRemoved':
            case 'entityMoved':
                this.markChanged();
                return;
            case 'componentAdded':
            case 'componentRemoved': {
                const isBody = update.component.schema.typeName === BodyComponent.schema.typeName;
                if (isBody) {
                    this.markChanged();
                    return;
                }

                if (this.affectsShown(update.entity)) {
                    this.version.increment();
                }
                return;
            }
            case 'valueChanged':
            case 'switchChanged':
                if (this.affectsShown(update.entity)) {
                    this.version.increment();
                }
                return;
            case 'levelRenamed':
                return;
        }
    }

    // Only the shown entities' own messages are on their cards.
    private followMessages(ids: ReadonlySet<EntityId>) {
        const touchesShown = this.shownEntities.some((entity) => ids.has(entity.id));
        if (touchesShown) {
            this.version.increment();
        }
    }

    private affectsShown(entity: Entity) {
        const isShown = this.shownEntitySet().has(entity);
        if (isShown) return true;

        const bodies = this.bodiesAmongShown();
        if (bodies.size === 0) return false;

        const isAboveABody = this.entitiesAboveShownBodies().has(entity);
        if (isAboveABody) return true;

        return isUnderOneOf(entity, bodies);
    }

    private shownEntitySet() {
        if (this.shownSet === undefined) {
            this.shownSet = new Set(this.shownEntities);
        }

        return this.shownSet;
    }

    private bodiesAmongShown() {
        if (this.shownBodies === undefined) {
            const bodies = this.shownEntities.filter((entity) => entity.hasComponent(BodyComponent));
            this.shownBodies = new Set(bodies);
        }

        return this.shownBodies;
    }

    private entitiesAboveShownBodies() {
        if (this.aboveShownBodies === undefined) {
            const above = new Set<Entity>();

            for (const body of this.bodiesAmongShown()) {
                addParentsOf(body, above);
            }

            this.aboveShownBodies = above;
        }

        return this.aboveShownBodies;
    }
}

function addParentsOf(entity: Entity, into: Set<Entity>) {
    let parent = entity.parent;

    while (parent !== undefined && !into.has(parent)) {
        into.add(parent);
        parent = parent.parent;
    }
}

function isUnderOneOf(entity: Entity, ancestors: ReadonlySet<Entity>) {
    let parent = entity.parent;

    while (parent !== undefined) {
        if (ancestors.has(parent)) return true;
        parent = parent.parent;
    }

    return false;
}
