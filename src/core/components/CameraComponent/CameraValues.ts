import type { EntityId } from '../../fields/index.ts';

// Fill window joins it in v3.
export type CameraMode = 'fixedSize';

export type CameraValues = {
    width: number;
    height: number;
    follow: EntityId | null;
    smoothing: number;
    mode: CameraMode;
};
