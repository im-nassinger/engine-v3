// The design's joint icon: a 14 level px circle, so it grows and shrinks with the zoom as the level does,
// but never under 8 screen px across, so a joint stays visible and can be clicked when zoomed far out.
// The level view draws it and HitTester hits it, so both read these numbers.
export const JOINT_ICON_RADIUS = 7;
const MIN_JOINT_ICON_RADIUS_PX = 4;

export function jointIconRadiusPx(zoom: number) {
    const radiusAtZoom = JOINT_ICON_RADIUS * zoom;

    return Math.max(MIN_JOINT_ICON_RADIUS_PX, radiusAtZoom);
}
