import { cardTitle } from '../../../core/components/index.ts';
import type { AnyComponent, ComponentTypeName, PartnerRule } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';

import type { EditorMessage } from '../model/EditorMessage.ts';
import type { EditorMessageRule } from '../model/EditorMessageRule.ts';

// "Needs a Shape to collide. [Add Shape]", from each component's partners in its schema.
export class MissingPartnerRule implements EditorMessageRule {
    check(entity: Entity): readonly EditorMessage[] {
        const held = new Set<ComponentTypeName>(entity.components.map((component) => component.schema.typeName));
        const messages: EditorMessage[] = [];

        for (const component of entity.components) {
            for (const partner of component.schema.partners) {
                if (!isMissing(partner, held)) continue;

                messages.push(partnerNote(entity, component, partner));
            }
        }

        return messages;
    }
}

function isMissing(partner: PartnerRule, held: ReadonlySet<ComponentTypeName>) {
    const appliesHere = partner.onlyWith === undefined || held.has(partner.onlyWith);
    if (!appliesHere) return false;

    const satisfiers = [partner.partner, ...(partner.alsoSatisfiedBy ?? [])];

    return !satisfiers.some((typeName) => held.has(typeName));
}

function partnerNote(entity: Entity, component: AnyComponent, partner: PartnerRule): EditorMessage {
    const partnerTitle = cardTitle(partner.partner);

    return {
        kind: 'warning',
        entityId: entity.id,
        componentType: component.schema.typeName,
        fieldKey: undefined,
        itemId: undefined,
        text: partner.noteText,
        fix: {
            kind: 'addComponent',
            label: `Add ${partnerTitle}`,
            componentType: partner.partner,
            savedValues: undefined,
        },
    };
}
