import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

import { rotateRefusal, rotateSelection } from './rotateSelection.ts';

type Turn = {
    readonly word: 'counterclockwise' | 'clockwise';
    readonly idPart: 'Left' | 'Right';
    readonly key: 'Z' | 'X';
    // Clockwise on screen is positive, as the Rotation field counts it.
    readonly sign: -1 | 1;
};

type Step = {
    readonly degrees: number;
    readonly modifiers: string;
};

// Z sits left of X, so it turns the other way.
const TURNS: readonly Turn[] = [
    { word: 'counterclockwise', idPart: 'Left', key: 'Z', sign: -1 },
    { word: 'clockwise', idPart: 'Right', key: 'X', sign: 1 },
];

// As an arrow moves 1 px and Shift+arrow 10 px.
const STEPS: readonly Step[] = [
    { degrees: 1, modifiers: '' },
    { degrees: 10, modifiers: 'Shift+' },
];

// Z and X turn the selection, Shift for 10°. Held, the key turns again with each key repeat. Ctrl+Z and
// Ctrl+X stay Undo and Cut, as a chord only matches its own modifiers.
export class RotateCommand implements EditorCommand {
    readonly id: string;
    readonly label: string;
    readonly shortcuts: readonly string[];
    readonly shortcutName: string;
    readonly repeatsWhileHeld = true;
    private readonly session: EditorSession;
    private readonly degrees: number;

    constructor(session: EditorSession, turn: Turn, step: Step) {
        this.session = session;
        this.degrees = turn.sign * step.degrees;
        this.id = `edit.rotate${turn.idPart}${step.degrees}`;
        this.label = `Rotate ${turn.word} ${step.degrees}°`;
        this.shortcuts = [`${step.modifiers}${turn.key}`];
        this.shortcutName = `Rotate ${step.degrees}°`;
    }

    // All four.
    static all(session: EditorSession) {
        return TURNS.flatMap((turn) => STEPS.map((step) => new RotateCommand(session, turn, step)));
    }

    availability(): Availability {
        const reason = rotateRefusal(this.session.openLevel);
        if (reason !== undefined) return { enabled: false, reason };

        return { enabled: true };
    }

    run(): CommandOutcome {
        return rotateSelection(this.session.openLevel, this.degrees);
    }
}
