import type { SolidFill } from '../../fields/index.ts';

export type StyleValues = {
    fill: SolidFill;
    outlineColour: string;
    outlineWidth: number;
    // 0 to 1, shown as 0 to 100 %.
    opacity: number;
};
