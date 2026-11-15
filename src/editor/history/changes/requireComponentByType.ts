import type { AnyComponent, ComponentTypeName } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';

export function requireComponentByType(entity: Entity, componentType: ComponentTypeName): AnyComponent {
    const component = entity.components.find((candidate) => candidate.schema.typeName === componentType);
    if (component === undefined) {
        throw new Error(`Entity ${entity.id} has no ${componentType}.`);
    }

    return component;
}
