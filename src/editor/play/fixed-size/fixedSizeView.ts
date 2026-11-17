import type { Point } from '../../../core/geometry/index.ts';
import type { CameraBox } from '../../../core/simulation/index.ts';
import type { ViewSize } from '../../view/index.ts';

// A rectangle on the screen, in CSS pixels from the window's top left corner.
export type ScreenRect = {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
};

// How Fixed size shows the camera's box in a window. zoom is screen pixels per level pixel, middle is
// where the box's middle is on the screen, and bars are the black rectangles around it: none, two
// above and below, or two at the sides.
export type FixedSizeView = {
    readonly zoom: number;
    readonly middle: Point;
    readonly bars: readonly ScreenRect[];
};

// A gap thinner than this is rounding, not a bar.
const SMALLEST_BAR_PX = 1e-6;

// The camera's box scaled to fit the window, centred, with black bars filling the rest.
export function fixedSizeView(cameraBox: CameraBox, windowSize: ViewSize): FixedSizeView {
    const widthZoom = windowSize.width / cameraBox.width;
    const heightZoom = windowSize.height / cameraBox.height;
    const fitsByWidth = widthZoom <= heightZoom;
    const zoom = fitsByWidth ? widthZoom : heightZoom;
    const middle = { x: windowSize.width / 2, y: windowSize.height / 2 };

    if (fitsByWidth) {
        const gap = (windowSize.height - cameraBox.height * zoom) / 2;

        return { zoom, middle, bars: barsAboveAndBelow(windowSize, gap) };
    }

    const gap = (windowSize.width - cameraBox.width * zoom) / 2;

    return { zoom, middle, bars: barsAtTheSides(windowSize, gap) };
}

function barsAboveAndBelow(windowSize: ViewSize, gap: number): ScreenRect[] {
    if (gap < SMALLEST_BAR_PX) return [];

    return [
        { x: 0, y: 0, width: windowSize.width, height: gap },
        { x: 0, y: windowSize.height - gap, width: windowSize.width, height: gap },
    ];
}

function barsAtTheSides(windowSize: ViewSize, gap: number): ScreenRect[] {
    if (gap < SMALLEST_BAR_PX) return [];

    return [
        { x: 0, y: 0, width: gap, height: windowSize.height },
        { x: windowSize.width - gap, y: 0, width: gap, height: windowSize.height },
    ];
}
