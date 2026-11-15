import type { BoundsCache, PiecesCache, WorldMatrixCache } from '../../../core/derived/index.ts';
import type { Level } from '../../../core/level/index.ts';
import type { ViewSettings, ViewState } from '../../../editor/view/index.ts';

// What an overlay reads to draw itself. The level and its caches are undefined until the view shows one.
// The caches follow the shown level.
export type OverlayScene = {
    readonly view: ViewState;
    readonly settings: ViewSettings;
    readonly level: Level | undefined;
    readonly caches: OverlayCaches | undefined;
};

export type OverlayCaches = {
    readonly pieces: PiecesCache;
    readonly bounds: BoundsCache;
    readonly worldMatrices: WorldMatrixCache;
};
