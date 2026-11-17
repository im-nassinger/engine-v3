import type { Level } from '../../level/index.ts';

import type { CameraSettings } from './CameraSettings.ts';
import { limitToLevel } from './limitToLevel.ts';

// The run starts with the camera on its target, so there is no opening pan, or where it was placed when
// there is none; either way limited to the level bounds.
export function startingCameraPosition(settings: CameraSettings, level: Level) {
    const target = settings.targetOrigin();
    const placed = settings.placedPosition();
    const start = target ?? placed;

    return limitToLevel(start, settings.box, level);
}
