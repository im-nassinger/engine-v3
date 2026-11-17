import { Graphics } from 'pixi.js';
import type { ScreenRect } from '../../../../editor/play/index.ts';

const BAR_COLOUR = 0x000000;

// Fixed size's black bars, in screen pixels, drawn over everything so nothing of the level shows on a bar.
export class LetterboxOverlay {
    readonly graphics = new Graphics();
    private drawn: readonly ScreenRect[] = [];

    // The bars drawn last. For tests.
    get bars() {
        return this.drawn;
    }

    update(bars: readonly ScreenRect[]) {
        this.graphics.clear();
        this.drawn = bars;

        for (const bar of bars) {
            this.graphics.rect(bar.x, bar.y, bar.width, bar.height);
        }
        if (bars.length > 0) {
            this.graphics.fill({ color: BAR_COLOUR });
        }
    }

    destroy() {
        this.graphics.destroy();
    }
}
