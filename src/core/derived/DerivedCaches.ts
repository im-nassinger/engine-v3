import type { Entity, Level } from '../level/index.ts';

import type { BodyMatrixSource } from './caches/BodyMatrixSource.ts';
import { BoundsCache } from './caches/BoundsCache.ts';
import { HiddenCache } from './caches/HiddenCache.ts';
import { PiecesCache } from './caches/PiecesCache.ts';
import { WorldMatrixCache } from './caches/WorldMatrixCache.ts';

// The four caches built for one level, so the editor's OpenLevel and the PlayMirror make and drop
// them as one piece. The BoundsCache reads this WorldMatrixCache. A play copy passes its body matrix source.
export class DerivedCaches {
    readonly worldMatrices: WorldMatrixCache;
    readonly hidden: HiddenCache;
    readonly pieces: PiecesCache;
    readonly bounds: BoundsCache;

    constructor(level: Level, bodyMatrices?: BodyMatrixSource) {
        this.worldMatrices = new WorldMatrixCache(level, bodyMatrices);
        this.hidden = new HiddenCache(level);
        this.pieces = new PiecesCache(level);
        this.bounds = new BoundsCache(level, this.worldMatrices);
    }

    // A body's pose changed during play: its matrix and bounds and its descendants' are stale.
    bodyMoved(entity: Entity) {
        this.worldMatrices.markBodyMoved(entity);
        this.bounds.markBodyMoved(entity);
    }

    // Stops all four following the level.
    dispose() {
        this.bounds.dispose();
        this.pieces.dispose();
        this.hidden.dispose();
        this.worldMatrices.dispose();
    }
}
