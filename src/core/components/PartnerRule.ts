import type { ComponentTypeName } from './ComponentTypeName.ts';

// Plain data: the editor's MissingPartnerRule checks it against the entity.
export type PartnerRule = {
    readonly partner: ComponentTypeName;
    // Other components that end the note too: a StyleComponent draws a PathComponent as well as a shape.
    readonly alsoSatisfiedBy?: readonly ComponentTypeName[];
    // The note shows only when the entity has this component.
    readonly onlyWith?: ComponentTypeName;
    // "Needs a SurfaceComponent to collide."
    readonly noteText: string;
};
