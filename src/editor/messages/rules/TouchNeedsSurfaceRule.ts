import { SurfaceComponent, TriggerComponent } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';

import type { EditorMessage } from '../model/EditorMessage.ts';
import type { EditorMessageRule } from '../model/EditorMessageRule.ts';

// "Needs a Surface to notice touching. [Add Surface as sensor]" under each touch trigger of an entity with
// no SurfaceComponent. Only touch triggers need one, so it is a rule on the trigger, not a partner. The fix
// adds the Surface with Sensor ticked, in one step.
export class TouchNeedsSurfaceRule implements EditorMessageRule {
    check(entity: Entity): readonly EditorMessage[] {
        const component = entity.getComponent(TriggerComponent);
        if (component === undefined || entity.hasComponent(SurfaceComponent)) return [];

        const touchTriggers = component.get('triggers').filter((trigger) => {
            const kind = trigger.when?.kind;

            return kind === 'touched' || kind === 'untouched';
        });

        return touchTriggers.map((trigger) => ({
            kind: 'warning',
            entityId: entity.id,
            componentType: TriggerComponent.schema.typeName,
            fieldKey: 'triggers',
            itemId: trigger.id,
            text: 'Needs a Surface to notice touching.',
            fix: {
                kind: 'addComponent',
                label: 'Add Surface as sensor',
                componentType: SurfaceComponent.schema.typeName,
                savedValues: { sensor: true },
            },
        }));
    }
}
