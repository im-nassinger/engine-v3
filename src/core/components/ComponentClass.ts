import type { AnyComponent, AnyComponentSchema } from './AnyComponent.ts';

// A component class, used to look a component up on an entity: `entity.getComponent(BodyComponent)`.
export type ComponentClass<T extends AnyComponent> = {
    readonly schema: AnyComponentSchema;
    new (...args: never[]): T;
};
