import type { AnyComponent, ComponentClass, ComponentTypeName } from '../../../core/components/index.ts';

import type { Availability } from './Availability.ts';

// One entry of the Add Component menu.
export type AddableComponent = {
    readonly typeName: ComponentTypeName;
    readonly componentClass: ComponentClass<AnyComponent>;
    readonly section: string;
    readonly availability: Availability;
};
