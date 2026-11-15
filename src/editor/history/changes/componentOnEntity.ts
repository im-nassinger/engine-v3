import type { AnyComponent, ComponentClass, ComponentTypeName } from '../../../core/components/index.ts';
import type { EntityId, Level } from '../../../core/level/index.ts';

import { requireComponentByType } from './requireComponentByType.ts';

export type ComponentChangeOptions = {
    readonly entityId: EntityId;
    readonly component: AnyComponent;
};

// A fresh copy goes on each time, so redo never puts back an object a later change still holds.
export function addCopy(level: Level, entityId: EntityId, component: AnyComponent) {
    const entity = level.requireEntity(entityId);

    const outcome = entity.addComponent(component.copy());
    if (!outcome.added) {
        throw new Error(`Entity ${entityId} already has a ${component.schema.typeName}.`);
    }
}

export function removeByType(level: Level, entityId: EntityId, componentType: ComponentTypeName) {
    const entity = level.requireEntity(entityId);
    const component = requireComponentByType(entity, componentType);

    // Every component class has the static schema ComponentClass asks for, so its constructor is one.
    const componentClass = component.constructor as ComponentClass<AnyComponent>;
    entity.removeComponent(componentClass);
}
