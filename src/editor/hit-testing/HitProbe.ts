import type { Entity } from '../../core/level/index.ts';

// What a hit test needs to know about the moment it is asked: the zoom, for the sizes that stay the same
// on screen, and the group you are inside, which decides whether entities inside the camera are reached.
export type HitProbe = {
    readonly zoom: number;
    readonly currentGroup: Entity;
};
