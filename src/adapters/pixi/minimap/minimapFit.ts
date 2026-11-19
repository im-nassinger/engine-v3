import type { Bounds } from '../../../core/geometry/index.ts';

export type PictureSize = {
    readonly width: number;
    readonly height: number;
};

export type PictureRectangle = {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
};

// Where the level bounds sit in the picture, and how many picture pixels one level pixel takes.
export type MinimapFit = PictureRectangle & {
    readonly scale: number;
};

// Below this the rectangle would vanish at high zoom. In CSS pixels, so the caller scales it.
export const SMALLEST_VIEW_RECTANGLE_PX = 4;

// The whole level bounds as large as they fit, centred.
export function minimapFit(levelBounds: Bounds, picture: PictureSize): MinimapFit {
    const widthScale = picture.width / levelBounds.width;
    const heightScale = picture.height / levelBounds.height;
    const scale = Math.min(widthScale, heightScale);
    const width = levelBounds.width * scale;
    const height = levelBounds.height * scale;
    const left = (picture.width - width) / 2;
    const top = (picture.height - height) / 2;

    return { scale, left, top, width, height };
}

// A length grown to the smallest size about its middle, then moved back inside the room it has.
function grownSpan(start: number, length: number, smallest: number, roomStart: number, roomLength: number) {
    const grownLength = Math.max(length, smallest);
    const grownStart = start - (grownLength - length) / 2;
    const latestStart = roomStart + roomLength - grownLength;
    const placedStart = Math.max(roomStart, Math.min(grownStart, latestStart));

    return { start: placedStart, length: grownLength };
}

// The part of the level bounds the view shows, on the picture. undefined when it shows none of them.
export function viewRectangle(
    fit: MinimapFit,
    levelBounds: Bounds,
    visibleBounds: Bounds,
    smallestSize: number,
): PictureRectangle | undefined {
    if (!visibleBounds.overlaps(levelBounds)) return undefined;

    const visibleLeft = Math.max(visibleBounds.left, levelBounds.left);
    const visibleTop = Math.max(visibleBounds.top, levelBounds.top);
    const visibleRight = Math.min(visibleBounds.right, levelBounds.right);
    const visibleBottom = Math.min(visibleBounds.bottom, levelBounds.bottom);

    const left = fit.left + (visibleLeft - levelBounds.left) * fit.scale;
    const top = fit.top + (visibleTop - levelBounds.top) * fit.scale;
    const width = (visibleRight - visibleLeft) * fit.scale;
    const height = (visibleBottom - visibleTop) * fit.scale;

    const across = grownSpan(left, width, smallestSize, fit.left, fit.width);
    const down = grownSpan(top, height, smallestSize, fit.top, fit.height);

    return { left: across.start, top: down.start, width: across.length, height: down.length };
}
