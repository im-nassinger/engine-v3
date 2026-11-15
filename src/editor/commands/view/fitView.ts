import type { Bounds } from '../../../core/geometry/index.ts';
import type { ViewState } from '../../view/index.ts';

// Fits the rectangle, except a single point, which is only centred: zooming to 1000% on an empty
// group's origin would lose the view.
export function fitView(view: ViewState, levelRectangle: Bounds) {
    const isPoint = levelRectangle.width === 0 && levelRectangle.height === 0;

    if (isPoint) {
        view.centreOn(levelRectangle.centre);
        return;
    }

    view.fit(levelRectangle);
}
