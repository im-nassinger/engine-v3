import { AnimationFrames, DevicePixelRatio } from '../adapters/browser/index.ts';
import { PixiLevelView } from '../adapters/pixi/index.ts';
import { BoundsCache, levelBoundsOf, PiecesCache, WorldMatrixCache } from '../core/derived/index.ts';
import type { Level } from '../core/entities/index.ts';
import { ViewSettings, ViewState } from '../editor/view/index.ts';

// The smallest wiring that draws a level on the page, until stage 5's EditorSession owns the level,
// its caches and the view. The view starts at 100% on the level's origin.
export async function startLevelView(host: HTMLElement, level: Level) {
    const view = new ViewState();
    view.setPanLimit(levelBoundsOf(level));

    const levelView = await PixiLevelView.create({
        view,
        settings: new ViewSettings(),
        frames: new AnimationFrames(),
        pixelRatio: new DevicePixelRatio(),
        drawing: { showUnstyled: true },
    });

    const worldMatrices = new WorldMatrixCache(level);
    const caches = {
        pieces: new PiecesCache(level),
        worldMatrices,
        bounds: new BoundsCache(level, worldMatrices),
    };

    levelView.mount(host);
    levelView.show(level, caches);

    return levelView;
}
