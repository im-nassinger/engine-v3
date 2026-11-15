import type { ComponentRegistry } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';

import type { AddableComponent } from '../model/AddableComponent.ts';
import { firstRefusal, unavailable } from '../model/Availability.ts';
import { addAvailability, notByHandReason } from '../rules/componentRules.ts';

import { componentOfType } from './componentValues.ts';

// The Add Component menu: every registered component with a menu section that some shown entity lacks,
// in the card order. It adds to each one that lacks it, so one that refuses greys the entry out.
export function addableComponents(entities: readonly Entity[], registry: ComponentRegistry) {
    const entries: AddableComponent[] = [];

    for (const componentClass of registry.inCardOrder()) {
        const { schema } = componentClass;
        const section = schema.addMenuSection;
        if (section === undefined) continue;

        const lacking = entities.filter((entity) => componentOfType(entity, schema.typeName) === undefined);
        if (lacking.length === 0) continue;

        let availability;
        if (schema.addableByHand) {
            const perEntity = lacking.map((entity) => addAvailability(entity, schema));
            availability = firstRefusal(perEntity);
        } else {
            const reason = notByHandReason(schema);
            if (reason === undefined) continue;

            availability = unavailable(reason);
        }

        entries.push({ typeName: schema.typeName, componentClass, section, availability });
    }

    return entries;
}
