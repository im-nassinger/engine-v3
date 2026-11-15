import type { AnyComponent } from '../AnyComponent.ts';
import type { ComponentClass } from './ComponentClass.ts';

// Finds a component class by the type name written in level.json. The reader, the Add Component menu and
// Lua use it; v2 registers its components into the same registry.
export class ComponentRegistry {
    private readonly classesInRegisterOrder: ComponentClass<AnyComponent>[] = [];

    register(componentClass: ComponentClass<AnyComponent>) {
        const typeName = componentClass.schema.typeName;
        const isRegistered = this.find(typeName) !== undefined;
        if (isRegistered) {
            throw new Error(`${typeName} is already registered.`);
        }

        this.classesInRegisterOrder.push(componentClass);
    }

    find(typeName: string) {
        return this.classesInRegisterOrder.find((componentClass) => componentClass.schema.typeName === typeName);
    }

    all(): readonly ComponentClass<AnyComponent>[] {
        return [...this.classesInRegisterOrder];
    }

    inCardOrder() {
        const sorted = [...this.classesInRegisterOrder];
        sorted.sort((first, second) => first.schema.cardOrder - second.schema.cardOrder);

        return sorted;
    }

    // Fixed by the order of registration, so a component id in Lua can be worked out, never stored.
    indexOf(typeName: string) {
        const index = this.classesInRegisterOrder.findIndex(
            (componentClass) => componentClass.schema.typeName === typeName,
        );
        if (index === -1) {
            throw new Error(`${typeName} is not registered.`);
        }

        return index;
    }
}
