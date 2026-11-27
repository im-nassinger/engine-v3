// The blob's animations: each frame described by a few numbers that blobArt.ts draws, so every frame stays
// on model. Poses are numbered right-facing first, animation by animation, then the same again facing left.
export type Eyes = 'open' | 'closed' | 'squint';
export type Mouth = 'smile' | 'open' | 'round';
export type Arms = 'down' | 'out' | 'up';

export type Leg = {
    // How far the foot swings forward (positive) or back, in pixels.
    readonly swing: number;
    // How high the foot is lifted from the ground line, in pixels.
    readonly lift: number;
};

export type FrameSpec = {
    readonly squashX: number;
    readonly squashY: number;
    // Moves the body up (negative) or down, in pixels, keeping the legs' feet where `Leg` puts them.
    readonly bob: number;
    // Shifts the top of the body forward, in pixels.
    readonly lean: number;
    readonly frontLeg: Leg;
    readonly backLeg: Leg;
    readonly arms: Arms;
    // Swings the arms forward (positive) or back, in pixels.
    readonly armSwing: number;
    readonly eyes: Eyes;
    readonly mouth: Mouth;
};

export type Animation = {
    readonly firstPose: number;
    readonly frameSeconds: number;
    readonly frames: readonly FrameSpec[];
};

const STANDING: FrameSpec = {
    squashX: 1,
    squashY: 1,
    bob: 0,
    lean: 0,
    frontLeg: { swing: 0, lift: 0 },
    backLeg: { swing: 0, lift: 0 },
    arms: 'down',
    armSwing: 0,
    eyes: 'open',
    mouth: 'smile',
};

function breathing(squashY: number, eyes: Eyes = 'open'): FrameSpec {
    const squashX = 2 - squashY;

    return { ...STANDING, squashX, squashY, eyes };
}

const IDLE_FRAMES = [
    breathing(1),
    breathing(0.99),
    breathing(0.975),
    breathing(0.965),
    breathing(0.965),
    breathing(0.975),
    breathing(0.99, 'closed'),
    breathing(1),
];

function runFrame(step: number): FrameSpec {
    const angle = (step / 6) * 2 * Math.PI;
    const swing = Math.cos(angle) * 11;
    // A foot is lifted while it swings forward and planted while it moves back, so the stride pushes the blob forward.
    const frontLift = Math.max(0, -Math.sin(angle)) * 9;
    const backLift = Math.max(0, Math.sin(angle)) * 9;
    const bob = -Math.abs(Math.sin(angle)) * 6;

    return {
        ...STANDING,
        squashX: 0.98,
        squashY: 1.02,
        bob,
        lean: 5,
        frontLeg: { swing, lift: frontLift },
        backLeg: { swing: -swing, lift: backLift },
        arms: 'out',
        armSwing: -swing * 0.6,
        mouth: 'open',
    };
}

const RUN_FRAMES = [0, 1, 2, 3, 4, 5].map(runFrame);

const RISE_FRAMES: FrameSpec[] = [
    {
        ...STANDING,
        squashX: 0.86,
        squashY: 1.14,
        bob: -4,
        frontLeg: { swing: -3, lift: 4 },
        backLeg: { swing: -7, lift: 6 },
        arms: 'down',
        armSwing: -5,
        mouth: 'round',
    },
];

const APEX_FRAMES: FrameSpec[] = [
    {
        ...STANDING,
        squashX: 1.04,
        squashY: 0.97,
        bob: -6,
        frontLeg: { swing: 4, lift: 10 },
        backLeg: { swing: -4, lift: 12 },
        arms: 'out',
        armSwing: 0,
        mouth: 'smile',
    },
];

function fallFrame(armSwing: number): FrameSpec {
    return {
        ...STANDING,
        squashX: 0.94,
        squashY: 1.06,
        bob: -2,
        frontLeg: { swing: 3, lift: 2 },
        backLeg: { swing: -3, lift: 0 },
        arms: 'up',
        armSwing,
        mouth: 'round',
    };
}

const FALL_FRAMES = [fallFrame(3), fallFrame(-3)];

const LAND_FRAMES: FrameSpec[] = [
    { ...STANDING, squashX: 1.2, squashY: 0.8, frontLeg: { swing: 5, lift: 0 }, eyes: 'squint', arms: 'out' },
    { ...STANDING, squashX: 1.08, squashY: 0.93, frontLeg: { swing: 2, lift: 0 } },
];

type AnimationName = 'idle' | 'run' | 'rise' | 'apex' | 'fall' | 'land';

function numberAnimations() {
    const timings: [AnimationName, number, readonly FrameSpec[]][] = [
        ['idle', 0.15, IDLE_FRAMES],
        ['run', 0.07, RUN_FRAMES],
        ['rise', 1, RISE_FRAMES],
        ['apex', 1, APEX_FRAMES],
        ['fall', 0.1, FALL_FRAMES],
        ['land', 0.07, LAND_FRAMES],
    ];
    const animations: Partial<Record<AnimationName, Animation>> = {};
    let firstPose = 0;

    for (const [name, frameSeconds, frames] of timings) {
        animations[name] = { firstPose, frameSeconds, frames };
        firstPose += frames.length;
    }

    return { animations: animations as Record<AnimationName, Animation>, poseCount: firstPose };
}

const NUMBERED = numberAnimations();

export const ANIMATIONS = NUMBERED.animations;
export const LEFT_POSE_OFFSET = NUMBERED.poseCount;
export const POSE_COUNT = NUMBERED.poseCount * 2;
export const FRAME_TAG = 'blob_frame';

export function poseTag(pose: number) {
    return `blob_pose_${pose}`;
}

// Every right-facing frame in pose order.
export function rightFrames() {
    return Object.values(ANIMATIONS).flatMap((animation) => animation.frames);
}
