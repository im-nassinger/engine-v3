import { levelBoundsOf } from '../../../core/derived/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';
import { fitView } from './fitView.ts';

const NO_LEVEL_BOUNDS = 'The level has no bounds';

// Fits the level bounds, the World's rectangle, into the view. Never a step.
export class FitWholeLevelCommand implements EditorCommand {
    readonly id = 'view.fitWholeLevel';
    readonly label = 'Whole level';
    readonly menu = { menu: 'View', section: 3, order: 10 } as const;
    readonly shortcuts: readonly string[] = [];
    private readonly session: EditorSession;

    constructor(session: EditorSession) {
        this.session = session;
    }

    availability(): Availability {
        const levelBounds = levelBoundsOf(this.session.openLevel.level);
        if (levelBounds === undefined) return { enabled: false, reason: NO_LEVEL_BOUNDS };

        return { enabled: true };
    }

    run(): CommandOutcome {
        const levelBounds = levelBoundsOf(this.session.openLevel.level);
        if (levelBounds === undefined) return { kind: 'refused', reason: NO_LEVEL_BOUNDS };

        fitView(this.session.view, levelBounds);

        return { kind: 'done' };
    }
}
