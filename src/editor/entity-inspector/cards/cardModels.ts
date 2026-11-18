import { TransformComponent } from '../../../core/components/index.ts';
import type { AnyComponent, ComponentTypeName } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { BodyMassCaches } from '../../../core/physics/index.ts';
import type { EditorMessages } from '../../messages/index.ts';

import type { CardFolds } from '../folds/CardFolds.ts';
import { firstRefusal } from '../model/Availability.ts';
import type { CardModel } from '../model/CardModel.ts';
import { isWorld, removeAvailability, resetAvailability } from '../rules/componentRules.ts';

import { cardNotes } from './cardNotes.ts';
import { componentOfType } from './componentValues.ts';
import { fieldModels } from './fieldModels.ts';
import type { HeldComponents } from './fieldModels.ts';

export type CardSources = {
    readonly folds: CardFolds;
    readonly caches: BodyMassCaches;
    readonly messages: EditorMessages;
};

// A card for each component every shown entity has, in the fixed card order. The World's
// TransformComponent is fixed at zero, so it has no card.
export function cardModels(entities: readonly Entity[], sources: CardSources) {
    const cards: CardModel[] = [];

    for (const typeName of sharedCardTypes(entities)) {
        const held = heldComponents(entities, typeName);
        const card = cardModel(held, sources);
        cards.push(card);
    }

    return cards;
}

function sharedCardTypes(entities: readonly Entity[]) {
    const first = entities[0];
    if (first === undefined) return [];

    const typeNames: ComponentTypeName[] = [];

    for (const component of first.components) {
        const { typeName, hasCard } = component.schema;
        if (!hasCard) continue;

        const isWorldsTransform = isWorld(first) && typeName === TransformComponent.schema.typeName;
        if (isWorldsTransform) continue;

        const everyOneHasIt = entities.every((entity) => componentOfType(entity, typeName) !== undefined);
        if (everyOneHasIt) {
            typeNames.push(typeName);
        }
    }

    return typeNames;
}

function heldComponents(entities: readonly Entity[], typeName: ComponentTypeName): HeldComponents {
    const components = entities.map((entity) => componentOfType(entity, typeName) as AnyComponent);
    const schema = (components[0] as AnyComponent).schema;

    return { schema, entities, components };
}

function cardModel(held: HeldComponents, sources: CardSources): CardModel {
    const fields = fieldModels(held, sources.caches);
    const removals = held.entities.map((entity) => removeAvailability(entity, held.schema));
    const canRemove = firstRefusal(removals);
    const canReset = resetAvailability(held.schema);
    const isFolded = sources.folds.isFolded(held.schema.typeName);
    const notes = cardNotes(held.entities, held.schema.typeName, sources.messages);

    return { typeName: held.schema.typeName, isFolded, fields, canRemove, canReset, notes };
}
