import type { BoundsCache } from '../../../core/derived/index.ts';
import type { Level } from '../../../core/entities/index.ts';
import type { ViewSettings, ViewState } from '../../../editor/view/index.ts';

// What an overlay reads to draw itself. The level and its caches are undefined until the view shows one.
export type OverlayScene = {
    readonly view: ViewState;
    readonly settings: ViewSettings;
    readonly level: Level | undefined;
    readonly bounds: BoundsCache | undefined;
};
