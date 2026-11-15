import { Bounds } from '../../../../core/geometry/index.ts';

// The parts of the view outside the level, as up to four rectangles that never overlap: a band above, a band
// below, and the two sides between them. Overlapping rectangles would dim their shared corner twice.
export function dimmedAreas(view: Bounds, level: Bounds): Bounds[] {
    if (!view.overlaps(level)) return [view];

    const top = Math.max(view.top, level.top);
    const bottom = Math.min(view.bottom, level.bottom);
    const candidates = [
        new Bounds(view.left, view.top, view.right, top),
        new Bounds(view.left, bottom, view.right, view.bottom),
        new Bounds(view.left, top, Math.max(view.left, level.left), bottom),
        new Bounds(Math.min(view.right, level.right), top, view.right, bottom),
    ];

    return candidates.filter((area) => area.width > 0 && area.height > 0);
}
