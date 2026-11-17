import type { SolidFill } from '../../fields/index.ts';

export type StyleValues = {
    fill: SolidFill;
    outlineColour: string;
    outlineWidth: number;
    // Off: the entity's own scale and skew don't stretch the outline. A parent group's still do.
    scaleOutline: boolean;
    // 0 to 1, shown as 0 to 100 %.
    opacity: number;
};
