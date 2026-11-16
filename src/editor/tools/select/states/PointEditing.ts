import type { EditedPoints } from '../points/EditedPoints.ts';

import type { SelectState } from './SelectState.ts';

// The point editing state a press or a box returns to, and can end.
export type PointEditing = SelectState & {
    readonly points: EditedPoints;
    readonly isEditing: boolean;
    end(): SelectState;
};
