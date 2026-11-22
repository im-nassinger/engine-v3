import { TriggerComponent } from '../../../core/components/index.ts';
import type { ComponentRegistry } from '../../../core/components/index.ts';
import type { Entity, EntityId, Level } from '../../../core/level/index.ts';
import { triggerCanRun, triggerProblems } from '../../../core/triggers/index.ts';

import type { EditorMessage } from '../model/EditorMessage.ts';
import type { EditorMessageRule } from '../model/EditorMessageRule.ts';

// "Doesn't run until every yellow part is set." under each trigger that triggerProblems stops, the same
// list the game reads, or that has no action yet (its Add action is yellow). A missing entity only skips
// its own part, so it has the `missing entity` note instead.
export class TriggerCantRunRule implements EditorMessageRule {
    private readonly registry: ComponentRegistry;

    constructor(registry: ComponentRegistry) {
        this.registry = registry;
    }

    check(entity: Entity, level: Level): readonly EditorMessage[] {
        const component = entity.getComponent(TriggerComponent);
        if (component === undefined) return [];

        const context = { owner: entity, level, registry: this.registry };
        const stopped = component.get('triggers').filter((trigger) => {
            const problems = triggerProblems(trigger, context);
            const hasNoAction = trigger.actions.length === 0;

            return hasNoAction || !triggerCanRun(problems);
        });

        return stopped.map((trigger) => ({
            kind: 'warning',
            entityId: entity.id,
            componentType: TriggerComponent.schema.typeName,
            fieldKey: 'triggers',
            itemId: trigger.id,
            text: "Doesn't run until every yellow part is set.",
            fix: undefined,
        }));
    }

    // The World holds the variables and inputs a trigger names, and a picked entity the values it changes.
    readsEntities(entity: Entity, level: Level): readonly EntityId[] {
        const component = entity.getComponent(TriggerComponent);
        if (component === undefined) return [];

        const read = new Set<EntityId>([level.world.id]);
        for (const trigger of component.get('triggers')) {
            for (const action of trigger.actions) {
                if (action.kind !== 'change' || action.target.kind !== 'entity') continue;
                if (action.target.entity === null) continue;

                read.add(action.target.entity);
            }
        }

        return [...read];
    }
}
