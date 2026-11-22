import { InputComponent, PhysicsWorldComponent } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';

import type { EditorMessage } from '../model/EditorMessage.ts';
import type { EditorMessageRule } from '../model/EditorMessageRule.ts';

// "No inputs. [Add the five inputs]" on the World's PhysicsWorld card, for a level saved before v3 or a
// World whose InputComponent was removed. The reader never adds it behind the user's back; the fix adds
// the InputComponent with its defaults, the five a new level starts with, in one step.
export class MissingInputsRule implements EditorMessageRule {
    check(entity: Entity): readonly EditorMessage[] {
        const isWorld = entity.hasComponent(PhysicsWorldComponent);
        if (!isWorld || entity.hasComponent(InputComponent)) return [];

        return [
            {
                kind: 'warning',
                entityId: entity.id,
                componentType: PhysicsWorldComponent.schema.typeName,
                fieldKey: undefined,
                text: 'No inputs.',
                fix: {
                    kind: 'addComponent',
                    label: 'Add the five inputs',
                    componentType: InputComponent.schema.typeName,
                },
            },
        ];
    }
}
