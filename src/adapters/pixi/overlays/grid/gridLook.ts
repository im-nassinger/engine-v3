import type { Fill } from '../../../../core/fields/index.ts';
import { isDarkBackground } from '../levelBackground.ts';
import type { GridLineStrength } from './GridPlan.ts';

export type GridLook = {
    readonly colour: number;
    readonly alpha: Readonly<Record<GridLineStrength, number>>;
};

const ON_LIGHT: GridLook = {
    colour: 0x1e3c5f,
    alpha: { fine: 0.07, step: 0.13, origin: 0.32 },
};

// Fainter than on a light fill, so the grid doesn't cut through a dark level's art.
const ON_DARK: GridLook = {
    colour: 0xffffff,
    alpha: { fine: 0.03, step: 0.05, origin: 0.14 },
};

export function gridLookFor(background: Fill | undefined) {
    return isDarkBackground(background) ? ON_DARK : ON_LIGHT;
}
