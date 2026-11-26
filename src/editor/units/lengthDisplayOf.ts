import type { Level } from '../../core/level/index.ts';
import { pixelsPerMetreOf } from '../../core/physics/index.ts';

import { LengthDisplay } from './LengthDisplay.ts';
import type { LengthUnit } from './LengthUnit.ts';

// How a level's lengths show now: ☰'s unit at the level World's Pixels per metre.
export function lengthDisplayOf(lengthUnit: LengthUnit, level: Level) {
    const pixelsPerMetre = pixelsPerMetreOf(level.world);

    return new LengthDisplay(lengthUnit, pixelsPerMetre);
}
