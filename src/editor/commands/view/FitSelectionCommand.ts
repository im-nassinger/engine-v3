import { levelBoundsOf } from '../../../core/derived/index.ts';
import { Bounds } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { EditorSession, OpenLevel } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';
import { fitView } from './fitView.ts';

const NOTHING_TO_FIT = 'The level has no bounds';

// F: fits what the selected entities and their children draw, or the whole level with nothing selected.
// An entity whose subtree draws nothing counts as its origin. A joint's bounds hold the point its icon
// sits on, and the icon's 8 screen px reach stays inside the fit's 40 px margin. Never a step.
export class FitSelectionCommand implements EditorCommand {
    readonly id = 'view.fitSelection';
    readonly label = 'Selection';
    readonly menu = { menu: 'View', section: 3, order: 20 } as const;
    readonly shortcuts = ['F'];
    private readonly session: EditorSession;

    constructor(session: EditorSession) {
        this.session = session;
    }

    availability(): Availability {
        const rectangle = this.rectangleToFit();
        if (rectangle === undefined) return { enabled: false, reason: NOTHING_TO_FIT };

        return { enabled: true };
    }

    run(): CommandOutcome {
        const rectangle = this.rectangleToFit();
        if (rectangle === undefined) return { kind: 'refused', reason: NOTHING_TO_FIT };

        fitView(this.session.view, rectangle);

        return { kind: 'done' };
    }

    private rectangleToFit() {
        const openLevel = this.session.openLevel;
        const selected = openLevel.selection.entities;
        if (selected.length === 0) return levelBoundsOf(openLevel.level);

        let rectangle: Bounds | undefined;

        for (const entity of selected) {
            const entityRectangle = boundsOrOrigin(openLevel, entity);

            if (rectangle === undefined) {
                rectangle = entityRectangle;
            } else {
                rectangle = rectangle.union(entityRectangle);
            }
        }

        return rectangle;
    }
}

function boundsOrOrigin(openLevel: OpenLevel, entity: Entity) {
    const { bounds, worldMatrices } = openLevel.caches;

    const subtreeBounds = bounds.subtreeBoundsOf(entity);
    if (subtreeBounds !== undefined) return subtreeBounds;

    const matrix = worldMatrices.matrixOf(entity);
    return new Bounds(matrix.tx, matrix.ty, matrix.tx, matrix.ty);
}
