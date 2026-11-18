import type { Entity } from '../../../core/level/index.ts';

import type { Availability } from './Availability.ts';
import type { Mixed } from './MIXED.ts';

export type EntityInspectorHeader = {
    // The entity's name, or `3 entities`.
    readonly title: string;
    // The one entity shown, for its kind icon; undefined with several.
    readonly entity: Entity | undefined;
    readonly canRename: Availability;
    readonly isHidden: boolean | Mixed;
};
