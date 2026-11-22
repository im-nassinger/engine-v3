import type { EntityId } from '../../../core/level/index.ts';
import type { EditOutcome } from '../../history/index.ts';
import type { MessageFix } from '../../messages/index.ts';
import type { OpenLevel } from '../../session/index.ts';

import { addComponent } from './addComponent.ts';

// A note's fix button: on every entity the note is about, in one step. The message clears on the next
// frame, when its entities are checked again.
export function applyMessageFix(openLevel: OpenLevel, fix: MessageFix, entityIds: readonly EntityId[]): EditOutcome {
    switch (fix.kind) {
        case 'addComponent': {
            const componentClass = openLevel.registry.find(fix.componentType);
            if (componentClass === undefined) {
                throw new Error(`${fix.componentType} is not registered.`);
            }

            return addComponent(openLevel, entityIds, componentClass, fix.savedValues);
        }
    }
}
