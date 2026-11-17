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
    readonly pixels: number;
    readonly modifiers: string;
};

const SIDES: readonly Side[] = [
    { word: 'wider', idPart: 'Wider', key: 'D', axis: 'x', sign: 1 },
    { word: 'narrower', idPart: 'Narrower', key: 'A', axis: 'x', sign: -1 },
    { word: 'taller', idPart: 'Taller', key: 'W', axis: 'y', sign: 1 },
    { word: 'shorter', idPart: 'Shorter', key: 'S', axis: 'y', sign: -1 },
];

// As an arrow moves 1 px and Shift+arrow 10 px. No grid step: the browser keeps Ctrl+Shift+W.
const STEPS: readonly Step[] = [
    { pixels: 1, modifiers: '' },
    { pixels: 10, modifiers: 'Shift+' },
];

// W, A, S and D resize the selection's shapes, changing their values, Shift for 10 px. Held, the key resizes
// again with each key repeat. Ctrl+A and Ctrl+S keep their own commands, as a chord only matches its own
// modifiers.
export class ResizeCommand implements EditorCommand {
    readonly id: string;
    readonly label: string;
    readonly shortcuts: readonly string[];
    readonly repeatsWhileHeld = true;
    private readonly session: EditorSession;
    private readonly axis: ResizeAxis;
    private readonly pixels: number;

    constructor(session: EditorSession, side: Side, step: Step) {
        this.session = session;
        this.axis = side.axis;
        this.pixels = side.sign * step.pixels;
        this.id = `edit.resize${side.idPart}${step.pixels}`;
        this.label = `Resize ${side.word} ${step.pixels} px`;
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
        return resizeSelection(this.session.openLevel, this.axis, this.pixels);
    }
}
