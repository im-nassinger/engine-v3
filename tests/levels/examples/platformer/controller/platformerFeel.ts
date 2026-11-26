// Every number that decides how the example platformer feels, in pixels, seconds and px/s (the units a
// trigger's amounts are saved in). Tuning the feel is an edit here and a rerun of writePlatformer.ts.
export const TICK_SECONDS = 1 / 60;
export const PIXELS_PER_METRE = 100;

// Gravity in m/s², as the World saves it, and what it adds to a falling speed each tick, in px/s.
export const GRAVITY = 30;
export const GRAVITY_PER_TICK = (GRAVITY * PIXELS_PER_METRE) / 60;

export const RUN_SPEED = 460;
export const GROUND_ACCELERATION = 80;
export const GROUND_DECELERATION = 96;
export const AIR_ACCELERATION = 44;
export const AIR_DECELERATION = 16;
// Added on top of the acceleration while pressing against the way the blob moves, so turning is quick.
export const TURN_BOOST = 60;

// A jump of about 3.7 times the blob's height when the key is held to the top.
export const JUMP_SPEED = 1300;
// Extra gravity per tick while rising with the jump key up: the short hop.
export const JUMP_CUT_PER_TICK = 110;
// Near the top of a held jump, a share of gravity is taken away, so the blob floats a moment.
export const APEX_BAND = 220;
export const APEX_LIFT_PER_TICK = GRAVITY_PER_TICK * 0.5;
export const APEX_AIR_ACCELERATION = 64;
// Extra gravity per tick while falling, for a snappier fall than the rise.
export const FALL_EXTRA_PER_TICK = 22;
export const MAX_FALL_SPEED = 1100;

export const COYOTE_SECONDS = 0.1;
export const JUMP_BUFFER_SECONDS = 0.12;
// A blob rising faster than this isn't standing, even while its feet still touch the ground it left.
export const STANDING_RISE_LIMIT = 60;

// The blob, in pixels: its solid shape and the cut on each corner.
export const BLOB_WIDTH = 62;
export const BLOB_HEIGHT = 74;
export const BLOB_CORNER_CUT = 12;
