import type { Entity } from '../../../../../src/core/level/index.ts';
import type { TriggerParts } from '../../../determinism/build/triggerParts.ts';

import {
    AIR_ACCELERATION,
    AIR_DECELERATION,
    APEX_AIR_ACCELERATION,
    APEX_BAND,
    APEX_LIFT_PER_TICK,
    COYOTE_SECONDS,
    FALL_EXTRA_PER_TICK,
    GROUND_ACCELERATION,
    GROUND_DECELERATION,
    JUMP_BUFFER_SECONDS,
    JUMP_CUT_PER_TICK,
    JUMP_SPEED,
    MAX_FALL_SPEED,
    RUN_SPEED,
    STANDING_RISE_LIMIT,
    TICK_SECONDS,
    TURN_BOOST,
} from './platformerFeel.ts';
import {
    addOwn,
    addToVariableOf,
    addVelocity,
    changeOwnBy,
    everyTick,
    fire,
    ifOwn,
    ifOwnAgainst,
    ifVelocity,
    otherHasTag,
    setOpacityOfTagged,
    setOwn,
    whenEvent,
    whenInput,
    whenOwnVariableBecomes,
} from './triggerBlocks.ts';
import { capAbove, capBelow, slowTowardZero } from './velocitySteps.ts';
import { ANIMATIONS, FRAME_TAG, LEFT_POSE_OFFSET, poseTag, POSE_COUNT } from '../art/blobAnimations.ts';
import type { Animation } from '../art/blobAnimations.ts';

export const GROUND_TAG = 'ground';
export const PLAYER_TAG = 'player';

// The blob's own variables and their starting values. `pose` starts on the first idle frame, the one the
// level shows before play.
export const BLOB_VARIABLES = {
    ground_contacts: 0,
    on_ground: false,
    grace: 0,
    buffer: 0,
    jump_held: false,
    left_held: false,
    right_held: false,
    move: 0,
    facing: 1,
    was_in_air: false,
    land_time: 0,
    state: 0,
    frame: 0,
    frame_time: 0,
    frame_count: 1,
    frame_seconds: 1,
    target_state: 0,
    target_count: 1,
    target_seconds: 1,
    pose_next: 0,
    pose: 0,
};

// Overshoot past the top speed is at most one tick's acceleration and turn boost, and past the fall
// limit one tick's gravity and extra fall; each cap's largest step covers half of it.
const RUN_CAP_STEP = 128;
const FALL_CAP_STEP = 64;
const JUMP_CANCEL_STEP = 512;

// The heartbeat: triggers that run every tick, in this order, before anything they fire. They read the
// keys and the Feet, count down the timers, then fire the movement, which fires the animation.
function heartbeat(): TriggerParts[] {
    return [
        { when: everyTick(), actions: [setOwn('on_ground', false), setOwn('move', 0)] },
        { when: everyTick(), checks: [ifOwn('ground_contacts', 'atLeast', 1)], actions: [fire('feet_down')] },
        { when: everyTick(), checks: [ifOwn('right_held', 'is', true)], actions: [addOwn('move', 1)] },
        { when: everyTick(), checks: [ifOwn('left_held', 'is', true)], actions: [addOwn('move', -1)] },
        { when: everyTick(), checks: [ifOwn('move', 'is', 1)], actions: [setOwn('facing', 1)] },
        { when: everyTick(), checks: [ifOwn('move', 'is', -1)], actions: [setOwn('facing', -1)] },
        { when: everyTick(), checks: [ifOwn('buffer', 'more', 0)], actions: [addOwn('buffer', -TICK_SECONDS)] },
        { when: everyTick(), checks: [ifOwn('grace', 'more', 0)], actions: [addOwn('grace', -TICK_SECONDS)] },
        { when: everyTick(), checks: [ifOwn('land_time', 'more', 0)], actions: [addOwn('land_time', -TICK_SECONDS)] },
        { when: everyTick(), actions: [fire('move_phase')] },
    ];
}

function keys(): TriggerParts[] {
    return [
        { when: whenInput('right', 'pressed'), actions: [setOwn('right_held', true)] },
        { when: whenInput('right', 'released'), actions: [setOwn('right_held', false)] },
        { when: whenInput('left', 'pressed'), actions: [setOwn('left_held', true)] },
        { when: whenInput('left', 'released'), actions: [setOwn('left_held', false)] },
        {
            when: whenInput('jump', 'pressed'),
            actions: [setOwn('buffer', JUMP_BUFFER_SECONDS), setOwn('jump_held', true)],
        },
        { when: whenInput('jump', 'released'), actions: [setOwn('jump_held', false)] },
    ];
}

// Standing: the Feet touch the ground and the blob isn't already rising away from it, so the tick a jump
// starts doesn't count as standing and give a second jump.
function standing(): TriggerParts[] {
    return [
        {
            when: whenEvent('feet_down'),
            checks: [ifVelocity('velocityY', 'atLeast', -STANDING_RISE_LIMIT)],
            actions: [setOwn('on_ground', true), setOwn('grace', COYOTE_SECONDS)],
        },
    ];
}

function movePhase(): TriggerParts[] {
    return [
        { when: whenEvent('move_phase'), checks: [ifOwn('on_ground', 'is', true)], actions: [fire('ground_run')] },
        { when: whenEvent('move_phase'), checks: [ifOwn('on_ground', 'is', false)], actions: [fire('air_run')] },
        { when: whenEvent('move_phase'), checks: [ifOwn('buffer', 'more', 0)], actions: [fire('try_jump')] },
        { when: whenEvent('move_phase'), checks: [ifVelocity('velocityY', 'less', 0)], actions: [fire('rising')] },
        { when: whenEvent('move_phase'), checks: [ifVelocity('velocityY', 'more', 0)], actions: [fire('falling')] },
        { when: whenEvent('move_phase'), actions: [fire('anim_phase')] },
    ];
}

// Pressing one way: a turn boost when moving the other way, the acceleration, then the top speed.
function pushing(event: string, direction: 1 | -1, acceleration: number): TriggerParts[] {
    const movingAgainst = direction === 1 ? ifVelocity('velocityX', 'less', 0) : ifVelocity('velocityX', 'more', 0);
    const capEvent = direction === 1 ? 'cap_right' : 'cap_left';

    return [
        { when: whenEvent(event), checks: [movingAgainst], actions: [addVelocity(direction * TURN_BOOST, 0)] },
        { when: whenEvent(event), actions: [addVelocity(direction * acceleration, 0), fire(capEvent)] },
    ];
}

function running(): TriggerParts[] {
    return [
        { when: whenEvent('ground_run'), checks: [ifOwn('move', 'is', 1)], actions: [fire('ground_right')] },
        { when: whenEvent('ground_run'), checks: [ifOwn('move', 'is', -1)], actions: [fire('ground_left')] },
        { when: whenEvent('ground_run'), checks: [ifOwn('move', 'is', 0)], actions: [fire('ground_stop')] },
        { when: whenEvent('air_run'), checks: [ifOwn('move', 'is', 1)], actions: [fire('air_right')] },
        { when: whenEvent('air_run'), checks: [ifOwn('move', 'is', -1)], actions: [fire('air_left')] },
        { when: whenEvent('air_run'), checks: [ifOwn('move', 'is', 0)], actions: [fire('air_stop')] },
        {
            when: whenEvent('air_run'),
            checks: [ifVelocity('velocityY', 'more', -APEX_BAND)],
            actions: [fire('near_apex')],
        },
        ...pushing('ground_right', 1, GROUND_ACCELERATION),
        ...pushing('ground_left', -1, GROUND_ACCELERATION),
        ...pushing('air_right', 1, AIR_ACCELERATION),
        ...pushing('air_left', -1, AIR_ACCELERATION),
        ...slowTowardZero('ground_stop', 'velocityX', GROUND_DECELERATION),
        ...slowTowardZero('air_stop', 'velocityX', AIR_DECELERATION),
        ...capAbove('cap_right', 'velocityX', RUN_SPEED, RUN_CAP_STEP),
        ...capBelow('cap_left', 'velocityX', -RUN_SPEED, RUN_CAP_STEP),
    ];
}

// Near the top of a held jump: less gravity, and a little more steering.
function apex(): TriggerParts[] {
    const extraSteer = APEX_AIR_ACCELERATION - AIR_ACCELERATION;

    return [
        {
            when: whenEvent('near_apex'),
            checks: [ifVelocity('velocityY', 'less', APEX_BAND)],
            actions: [fire('at_apex')],
        },
        {
            when: whenEvent('at_apex'),
            checks: [ifOwn('jump_held', 'is', true)],
            actions: [addVelocity(0, -APEX_LIFT_PER_TICK), fire('apex_steer')],
        },
        {
            when: whenEvent('apex_steer'),
            checks: [ifOwn('move', 'is', 1)],
            actions: [addVelocity(extraSteer, 0), fire('cap_right')],
        },
        {
            when: whenEvent('apex_steer'),
            checks: [ifOwn('move', 'is', -1)],
            actions: [addVelocity(-extraSteer, 0), fire('cap_left')],
        },
    ];
}

// A jump needs a press kept in the buffer and grace left from standing (coyote time). A falling speed
// is cancelled first, so a late jump off a ledge is as high as one from the ground.
function jumping(): TriggerParts[] {
    return [
        { when: whenEvent('try_jump'), checks: [ifOwn('grace', 'more', 0)], actions: [fire('jump')] },
        ...capAbove('jump', 'velocityY', 0, JUMP_CANCEL_STEP),
        {
            when: whenEvent('jump'),
            actions: [addVelocity(0, -JUMP_SPEED), setOwn('buffer', 0), setOwn('grace', 0), setOwn('land_time', 0)],
        },
    ];
}

// Releasing jump while rising pulls the blob down harder: the short hop. Falling is a little faster than
// rising, up to the fall speed limit.
function gravityShaping(): TriggerParts[] {
    return [
        {
            when: whenEvent('rising'),
            checks: [ifOwn('jump_held', 'is', false)],
            actions: [addVelocity(0, JUMP_CUT_PER_TICK)],
        },
        { when: whenEvent('falling'), actions: [addVelocity(0, FALL_EXTRA_PER_TICK)] },
        ...capAbove('falling', 'velocityY', MAX_FALL_SPEED, FALL_CAP_STEP),
    ];
}

function target(animation: Animation) {
    return [
        setOwn('target_state', animation.firstPose),
        setOwn('target_count', animation.frames.length),
        setOwn('target_seconds', animation.frameSeconds),
    ];
}

// Picks the animation the blob should play this tick, from the ground, the keys and the vertical speed.
function animationChoice(): TriggerParts[] {
    return [
        { when: whenEvent('anim_phase'), checks: [ifOwn('on_ground', 'is', true)], actions: [fire('anim_ground')] },
        { when: whenEvent('anim_phase'), checks: [ifOwn('on_ground', 'is', false)], actions: [fire('anim_air')] },

        { when: whenEvent('anim_ground'), actions: target(ANIMATIONS.idle) },
        { when: whenEvent('anim_ground'), checks: [ifOwn('move', 'isNot', 0)], actions: target(ANIMATIONS.run) },
        {
            when: whenEvent('anim_ground'),
            checks: [ifOwn('was_in_air', 'is', true)],
            actions: [setOwn('land_time', ANIMATIONS.land.frameSeconds * 2), setOwn('was_in_air', false)],
        },
        { when: whenEvent('anim_ground'), checks: [ifOwn('land_time', 'more', 0)], actions: target(ANIMATIONS.land) },
        { when: whenEvent('anim_ground'), actions: [fire('anim_frame')] },

        { when: whenEvent('anim_air'), actions: [setOwn('was_in_air', true), ...target(ANIMATIONS.rise)] },
        {
            when: whenEvent('anim_air'),
            checks: [ifVelocity('velocityY', 'more', -APEX_BAND)],
            actions: target(ANIMATIONS.apex),
        },
        {
            when: whenEvent('anim_air'),
            checks: [ifVelocity('velocityY', 'more', APEX_BAND)],
            actions: target(ANIMATIONS.fall),
        },
        { when: whenEvent('anim_air'), actions: [fire('anim_frame')] },
    ];
}

// Steps the frames: a new animation starts at its first frame; each frame lasts its animation's time;
// the last frame goes back to the first. Then the pose is worked out in `pose_next` and copied to `pose`
// in one change, so the frame shown changes at most once a tick.
function animationFrames(): TriggerParts[] {
    return [
        {
            when: whenEvent('anim_frame'),
            checks: [ifOwnAgainst('state', 'isNot', 'target_state')],
            actions: [
                changeOwnBy('state', 'set', 'target_state'),
                changeOwnBy('frame_count', 'set', 'target_count'),
                changeOwnBy('frame_seconds', 'set', 'target_seconds'),
                setOwn('frame', 0),
                setOwn('frame_time', 0),
            ],
        },
        { when: whenEvent('anim_frame'), actions: [addOwn('frame_time', TICK_SECONDS)] },
        {
            when: whenEvent('anim_frame'),
            checks: [ifOwnAgainst('frame_time', 'atLeast', 'frame_seconds')],
            actions: [fire('anim_step')],
        },
        { when: whenEvent('anim_frame'), actions: [fire('anim_show')] },

        {
            when: whenEvent('anim_step'),
            actions: [changeOwnBy('frame_time', 'subtract', 'frame_seconds'), addOwn('frame', 1)],
        },
        {
            when: whenEvent('anim_step'),
            checks: [ifOwnAgainst('frame', 'atLeast', 'frame_count')],
            actions: [setOwn('frame', 0)],
        },

        {
            when: whenEvent('anim_show'),
            actions: [changeOwnBy('pose_next', 'set', 'state'), changeOwnBy('pose_next', 'add', 'frame')],
        },
        {
            when: whenEvent('anim_show'),
            checks: [ifOwn('facing', 'is', -1)],
            actions: [addOwn('pose_next', LEFT_POSE_OFFSET)],
        },
        { when: whenEvent('anim_show'), actions: [changeOwnBy('pose', 'set', 'pose_next')] },
    ];
}

// One trigger per pose: hide every frame, then show this one, in the same tick.
function poseDisplay(): TriggerParts[] {
    const triggers: TriggerParts[] = [];

    for (let pose = 0; pose < POSE_COUNT; pose++) {
        triggers.push({
            when: whenOwnVariableBecomes('pose', pose),
            actions: [setOpacityOfTagged(FRAME_TAG, 0), setOpacityOfTagged(poseTag(pose), 1)],
        });
    }

    return triggers;
}

export function blobTriggers(): TriggerParts[] {
    return [
        ...heartbeat(),
        ...keys(),
        ...standing(),
        ...movePhase(),
        ...running(),
        ...apex(),
        ...jumping(),
        ...gravityShaping(),
        ...animationChoice(),
        ...animationFrames(),
        ...poseDisplay(),
    ];
}

// The Feet count the ground they touch on the blob's `ground_contacts`.
export function feetTriggers(blob: Entity): TriggerParts[] {
    return [
        {
            when: { kind: 'touched' },
            checks: [otherHasTag(GROUND_TAG)],
            actions: [addToVariableOf(blob, 'ground_contacts', 1)],
        },
        {
            when: { kind: 'untouched' },
            checks: [otherHasTag(GROUND_TAG)],
            actions: [addToVariableOf(blob, 'ground_contacts', -1)],
        },
    ];
}
