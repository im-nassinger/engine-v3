import { AnimationFrames, DevicePixelRatio } from '../adapters/browser/index.ts';
import { PixiLevelView } from '../adapters/pixi/index.ts';
import { DerivedCaches, levelBoundsOf } from '../core/derived/index.ts';
import type { Level } from '../core/entities/index.ts';
import { ViewSettings, ViewState } from '../editor/view/index.ts';

// The smallest wiring that draws a level on the page, until stage 6's editor page builds an EditorSession,
// which owns the level, its caches and the view. The view starts at 100% on the level's origin.
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

    levelView.mount(host);
    levelView.show(level, new DerivedCaches(level));

    return levelView;
}
