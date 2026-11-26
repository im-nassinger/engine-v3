import type { EditorSession } from '../../session/index.ts';
import type { LengthUnit } from '../../units/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

type LengthUnitEntry = {
    readonly lengthUnit: LengthUnit;
    readonly id: string;
    readonly label: string;
    readonly order: number;
};

// Metres or Pixels at the end of the View menu: the unit every length shows in, the chosen one ticked.
// Saved in the browser with the switches, never a step (v4 fix 12).
export class LengthUnitCommand implements EditorCommand {
    readonly id: string;
    readonly label: string;
    readonly menu;
    readonly shortcuts: readonly string[] = [];
    private readonly lengthUnit: LengthUnit;
    private readonly session: EditorSession;

    constructor(session: EditorSession, entry: LengthUnitEntry) {
        this.session = session;
        this.lengthUnit = entry.lengthUnit;
        this.id = entry.id;
        this.label = entry.label;
        this.menu = { menu: 'View', section: 4, order: entry.order } as const;
    }

    availability(): Availability {
        return { enabled: true };
    }

    checked() {
        return this.session.viewSettings.lengthUnit === this.lengthUnit;
    }

    run(): CommandOutcome {
        this.session.viewSettings.setLengthUnit(this.lengthUnit);

        return { kind: 'done' };
    }
}

export const LENGTH_UNIT_ENTRIES: readonly LengthUnitEntry[] = [
    { lengthUnit: 'metres', id: 'view.metres', label: 'Metres', order: 10 },
    { lengthUnit: 'pixels', id: 'view.pixels', label: 'Pixels', order: 20 },
];
