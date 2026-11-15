import type { Point } from '../../../core/geometry/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

import { nudgeSelection } from './nudgeSelection.ts';
import { SelectionMove } from './SelectionMove.ts';

type Direction = {
    readonly word: 'left' | 'right' | 'up' | 'down';
    readonly key: 'Left' | 'Right' | 'Up' | 'Down';
    // The level's y grows downwards.
    readonly unit: Point;
};

type Distance = {
    readonly name: string;
    readonly idPart: string;
    readonly modifiers: string;
    pixels(session: EditorSession): number;
};

const DIRECTIONS: readonly Direction[] = [
    { word: 'left', key: 'Left', unit: { x: -1, y: 0 } },
    { word: 'right', key: 'Right', unit: { x: 1, y: 0 } },
    { word: 'up', key: 'Up', unit: { x: 0, y: -1 } },
    { word: 'down', key: 'Down', unit: { x: 0, y: 1 } },
];

const DISTANCES: readonly Distance[] = [
    { name: '1 px', idPart: '1', modifiers: '', pixels: () => 1 },
    { name: '10 px', idPart: '10', modifiers: 'Shift+', pixels: () => 10 },
    {
        name: 'one grid step',
        idPart: 'Grid',
        modifiers: 'Ctrl+Shift+',
        pixels: (session) => session.openLevel.level.editorData.gridSize,
    },
];

// The shortcut table's arrow keys: one command per direction and distance, only with the mouse over the
// level view, so a focused field keeps its arrows. Held, the key runs again with each key repeat.
export class NudgeCommand implements EditorCommand {
    readonly id: string;
    readonly label: string;
    readonly shortcuts: readonly string[];
    readonly shortcutScope = 'levelView' as const;
    readonly repeatsWhileHeld = true;
    private readonly session: EditorSession;
    private readonly direction: Direction;
    private readonly distance: Distance;

    constructor(session: EditorSession, direction: Direction, distance: Distance) {
        this.session = session;
        this.direction = direction;
        this.distance = distance;
        const capitalWord = direction.word.charAt(0).toUpperCase() + direction.word.slice(1);
        this.id = `edit.nudge${capitalWord}${distance.idPart}`;
        this.label = `Move ${direction.word} ${distance.name}`;
        this.shortcuts = [`${distance.modifiers}${direction.key}`];
    }

    // All twelve.
    static all(session: EditorSession) {
        return DIRECTIONS.flatMap((direction) =>
            DISTANCES.map((distance) => new NudgeCommand(session, direction, distance)),
        );
    }

    availability(): Availability {
        const { openLevel } = this.session;
        if (openLevel.liveEdit.isActive) return { enabled: false, reason: 'Not during a drag' };

        const move = SelectionMove.ofSelection(openLevel);
        if (!(move instanceof SelectionMove)) return { enabled: false, reason: move.reason };

        return { enabled: true };
    }

    run(): CommandOutcome {
        const pixels = this.distance.pixels(this.session);
        const { unit } = this.direction;
        const offset = { x: unit.x * pixels, y: unit.y * pixels };

        return nudgeSelection(this.session.openLevel, offset);
    }
}
