import { describe, expect, test } from 'vitest';

import { BodyPoses } from './BodyPoses.ts';

describe('BodyPoses', () => {
    test('a placed pose is kept without counting as a move', () => {
        const poses = new BodyPoses();
        poses.place(4, { x: 10, y: 20, angle: 30 });

        expect(poses.poseOf(4)).toEqual({ x: 10, y: 20, angle: 30 });
        expect(poses.moved).toEqual([]);
    });

    test('moves are listed in the order they were recorded and replace the pose', () => {
        const poses = new BodyPoses();
        poses.place(4, { x: 0, y: 0, angle: 0 });
        poses.recordMove(7, { x: 1, y: 2, angle: 3 });
        poses.recordMove(4, { x: 5, y: 6, angle: 7 });

        expect(poses.moved).toEqual([7, 4]);
        expect(poses.poseOf(4)).toEqual({ x: 5, y: 6, angle: 7 });
    });

    test('clearing the moves keeps the poses', () => {
        const poses = new BodyPoses();
        poses.recordMove(7, { x: 1, y: 2, angle: 3 });
        poses.clearMoved();

        expect(poses.moved).toEqual([]);
        expect(poses.poseOf(7)).toEqual({ x: 1, y: 2, angle: 3 });
    });

    test('a forgotten body has no pose', () => {
        const poses = new BodyPoses();
        poses.place(4, { x: 0, y: 0, angle: 0 });
        poses.forget(4);

        expect(poses.poseOf(4)).toBeUndefined();
    });
});
