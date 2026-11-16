// Which side a handle sits on along one of the frame's own axes: -1 the left or top, 1 the right or bottom,
// 0 the middle.
export type HandleSide = -1 | 0 | 1;

// One of the eight resize handles: four corners and four sides. A side handle has 0 on the axis it doesn't move.
export type FrameHandle = {
    readonly x: HandleSide;
    readonly y: HandleSide;
};

// Corners first, so where a small frame's handles overlap, a corner wins a tie.
export const FRAME_HANDLES: readonly FrameHandle[] = [
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
];

// The stage 9 choice: 8 screen px squares, grabbed within 4 px of their edge.
export const HANDLE_SIZE_PX = 8;
export const HANDLE_GRAB_PX = 4;
// The rotate area: a square this big just outside each corner, measured from the corner outward along the
// frame's own sides. A handle in it wins.
export const ROTATE_AREA_PX = 16;
