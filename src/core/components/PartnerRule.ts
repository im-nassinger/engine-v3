import type { ComponentTypeName } from './ComponentTypeName.ts';

// Plain data: the editor's MissingPartnerRule checks it against the entity.
export type PartnerRule = {
    readonly partner: ComponentTypeName;
    // The note shows only when the entity has this component.
    readonly onlyWith?: ComponentTypeName;
    // "Needs a SurfaceComponent to collide."
    readonly noteText: string;
};
