import { CameraComponent } from '../../components/index.ts';
import type { DerivedCaches } from '../../derived/index.ts';
import type { Point } from '../../geometry/index.ts';
import type { Level } from '../../level/index.ts';

import type { CameraBox } from './CameraBox.ts';

const ORIGIN = { x: 0, y: 0 };

// The camera's values a tick reads from the play copy. Follow and Smoothing may change during play, so
// they are read again each tick.
export class CameraSettings {
    readonly box: CameraBox;
    private readonly level: Level;
    private readonly caches: DerivedCaches;

    constructor(level: Level, caches: DerivedCaches) {
        const camera = level.camera.requireComponent(CameraComponent);

        this.level = level;
        this.caches = caches;
        this.box = { width: camera.get('width'), height: camera.get('height') };
    }

    get smoothingSeconds() {
        return this.camera.get('smoothing');
    }

    private get camera() {
        return this.level.camera.requireComponent(CameraComponent);
    }

    // Where the camera entity was placed in the level.
    placedPosition() {
        const matrix = this.caches.worldMatrices.matrixOf(this.level.camera);

        return matrix.apply(ORIGIN);
    }

    // The follow target's level origin, or undefined when there is no target or it is gone from the run.
    // A hidden target is still followed.
    targetOrigin(): Point | undefined {
        const followId = this.camera.get('follow');
        if (followId === null) return undefined;

        const target = this.level.findEntity(followId);
        if (target === undefined) return undefined;

        const matrix = this.caches.worldMatrices.matrixOf(target);

        return matrix.apply(ORIGIN);
    }
}
