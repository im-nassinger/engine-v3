import { TagsComponent } from '../../../../../src/core/components/index.ts';
import type { Action, VariableValue } from '../../../../../src/core/fields/index.ts';
import type { Point } from '../../../../../src/core/geometry/index.ts';
import type { Entity, Level } from '../../../../../src/core/level/index.ts';
import { addBody, addEntity, addShape, at, rectangle } from '../../../determinism/build/levelParts.ts';
import { giveOwnVariables, giveTriggers } from '../../../determinism/build/triggerParts.ts';
import type { TriggerParts } from '../../../determinism/build/triggerParts.ts';

import { addArtPath } from '../../platformer/art/artEntities.ts';
import { PLAYER_TAG } from '../../platformer/controller/blobController.ts';
import {
    addOwn,
    otherHasTag,
    setOpacityOfTagged,
    setOwn,
    whenOwnVariableBecomes,
} from '../../platformer/controller/triggerBlocks.ts';
import { MONSTER_FRAMES, monsterFrameParts } from '../art/monster.ts';
import { MONSTER_FLOOR } from '../course/layout.ts';

// The Gloom: a Kinematic body that glides through everything along MONSTER_FLOOR, at one speed, once the
// level has started. It never looks at the Blob: its path is the same every run, a Wait between each
// change of velocity, so the chase is fair and can be learned. Touching the Blob loses the run.
export const MONSTER_START_X = -6550;
export const MONSTER_SPEED = 455;
export const MONSTER_START_DELAY_SECONDS = 0.8;
const TICKS_PER_SECOND = 60;
const FRAME_TICKS = 5;
const FRAME_TAG = 'monster_frame';

// The part of the beast that catches: its body and its jaws, not the claw reaching ahead.
const CATCH_WIDTH = 250;
const CATCH_HEIGHT = 380;
const CATCH_CENTRE: Point = { x: 10, y: -230 };

function poseTag(frame: number) {
    return `monster_pose_${frame}`;
}

function floorAt(x: number) {
    for (let i = 1; i < MONSTER_FLOOR.length; i++) {
        const before = MONSTER_FLOOR[i - 1];
        const after = MONSTER_FLOOR[i];
        if (before === undefined || after === undefined) continue;
        if (x <= after.x) {
            const share = (x - before.x) / (after.x - before.x);

            return before.y + (after.y - before.y) * share;
        }
    }

    return MONSTER_FLOOR.at(-1)?.y ?? 0;
}

export const MONSTER_START: Point = { x: MONSTER_START_X, y: floorAt(MONSTER_START_X) };

function setVelocity(x: number, y: number): Action {
    return { kind: 'change', target: { kind: 'this' }, value: { kind: 'velocity' }, op: 'set', amount: { x, y } };
}

function wait(ticks: number): Action {
    return { kind: 'wait', seconds: ticks / TICKS_PER_SECOND };
}

// One velocity and one Wait for each stretch of the path, each a whole number of ticks long.
export function monsterRoute(): Action[] {
    const actions: Action[] = [wait(Math.round(MONSTER_START_DELAY_SECONDS * TICKS_PER_SECOND))];
    let from = MONSTER_START;
    for (const corner of MONSTER_FLOOR) {
        if (corner.x <= from.x) continue;
        const ticks = Math.max(1, Math.round(((corner.x - from.x) / MONSTER_SPEED) * TICKS_PER_SECOND));
        const seconds = ticks / TICKS_PER_SECOND;
        const velocityX = Math.round(((corner.x - from.x) / seconds) * 1000) / 1000;
        const velocityY = Math.round(((corner.y - from.y) / seconds) * 1000) / 1000;
        actions.push(setVelocity(velocityX, velocityY), wait(ticks));
        from = corner;
    }
    actions.push(setVelocity(0, 0));

    return actions;
}

function animationTriggers(): TriggerParts[] {
    const shows: TriggerParts[] = [];
    for (let frame = 0; frame < MONSTER_FRAMES; frame++) {
        shows.push({
            when: whenOwnVariableBecomes('frame', frame),
            actions: [setOpacityOfTagged(FRAME_TAG, 0), setOpacityOfTagged(poseTag(frame), 1)],
        });
    }

    return [
        { when: { kind: 'every', time: FRAME_TICKS, unit: 'ticks' }, actions: [addOwn('frame', 1)] },
        { when: whenOwnVariableBecomes('frame', MONSTER_FRAMES), actions: [setOwn('frame', 0)] },
        ...shows,
    ];
}

function addFrames(level: Level, monster: Entity) {
    const art = addEntity(level, monster, 'Art');
    for (let frame = 0; frame < MONSTER_FRAMES; frame++) {
        const group = addEntity(level, art, `Frame ${frame + 1}`);
        const opacity = frame === 0 ? 1 : 0;
        for (const artPart of monsterFrameParts(frame)) {
            addArtPath(level, group, artPart, opacity, [FRAME_TAG, poseTag(frame)]);
        }
    }
}

export function addMonster(level: Level) {
    const monster = addEntity(level, level.world, 'Gloom', at(MONSTER_START.x, MONSTER_START.y));
    addBody(monster, { type: 'kinematic', fixedRotation: true });
    monster.addComponent(new TagsComponent({ tags: ['monster'] }));
    const variables: Record<string, VariableValue> = { frame: 0 };
    giveOwnVariables(monster, variables);
    giveTriggers(monster, [{ when: { kind: 'levelStart' }, actions: monsterRoute() }, ...animationTriggers()]);

    const jaws = addEntity(level, monster, 'Jaws', at(CATCH_CENTRE.x, CATCH_CENTRE.y));
    addShape(jaws, rectangle(CATCH_WIDTH, CATCH_HEIGHT));
    giveTriggers(jaws, [{ when: { kind: 'touched' }, checks: [otherHasTag(PLAYER_TAG)], actions: [{ kind: 'lose' }] }]);

    addFrames(level, monster);

    return monster;
}
