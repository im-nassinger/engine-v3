import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

import { resizeRefusal, resizeSelection } from './resizeSelection.ts';
import type { ResizeAxis } from './resizeSelection.ts';

type Side = {
    readonly word: 'wider' | 'narrower' | 'taller' | 'shorter';
    readonly idPart: 'Wider' | 'Narrower' | 'Taller' | 'Shorter';
    readonly key: 'D' | 'A' | 'W' | 'S';
    readonly axis: ResizeAxis;
    readonly sign: -1 | 1;
};

type Step = {
    readonly name: string;
    readonly idPart: string;
    readonly modifiers: string;
    pixels(session: EditorSession): number;
};

const SIDES: readonly Side[] = [
    { word: 'wider', idPart: 'Wider', key: 'D', axis: 'x', sign: 1 },
    { word: 'narrower', idPart: 'Narrower', key: 'A', axis: 'x', sign: -1 },
    { word: 'taller', idPart: 'Taller', key: 'W', axis: 'y', sign: 1 },
    { word: 'shorter', idPart: 'Shorter', key: 'S', axis: 'y', sign: -1 },
];

// 1 px a press, and one grid step with Shift (owner, 2026-11-19).
const STEPS: readonly Step[] = [
    { name: '1 px', idPart: '1', modifiers: '', pixels: () => 1 },
    {
        name: 'one grid step',
        idPart: 'Grid',
        modifiers: 'Shift+',
        pixels: (session) => session.openLevel.level.editorData.gridSize,
    },
];

// W, A, S and D resize the selection's shapes, changing their values, Shift for one grid step. Held, the key resizes
// again with each key repeat. Ctrl+A and Ctrl+S keep their own commands, as a chord only matches its own
// modifiers.
export class ResizeCommand implements EditorCommand {
    readonly id: string;
    readonly label: string;
    readonly shortcuts: readonly string[];
    readonly repeatsWhileHeld = true;
    private readonly session: EditorSession;
    private readonly axis: ResizeAxis;
    private readonly sign: -1 | 1;
    private readonly step: Step;

    constructor(session: EditorSession, side: Side, step: Step) {
        this.session = session;
        this.axis = side.axis;
        this.sign = side.sign;
        this.step = step;
        this.id = `edit.resize${side.idPart}${step.idPart}`;
        this.label = `Resize ${side.word} ${step.name}`;
        this.shortcuts = [`${step.modifiers}${side.key}`];
    }

    // All eight.
    static all(session: EditorSession) {
        return SIDES.flatMap((side) => STEPS.map((step) => new ResizeCommand(session, side, step)));
    }

    availability(): Availability {
        const reason = resizeRefusal(this.session.openLevel);
        if (reason !== undefined) return { enabled: false, reason };

        return { enabled: true };
    }

    run(): CommandOutcome {
        const pixels = this.sign * this.step.pixels(this.session);

        return resizeSelection(this.session.openLevel, this.axis, pixels);
    }
}
