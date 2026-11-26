// How the editor shows lengths and speeds: in metres, at the World's Pixels per metre, or in the stored
// pixels. ☰'s choice, saved in the browser and never in the level (v4 fix 12).
export type LengthUnit = 'metres' | 'pixels';

export const DEFAULT_LENGTH_UNIT: LengthUnit = 'metres';

export const LENGTH_UNITS: readonly LengthUnit[] = ['metres', 'pixels'];
