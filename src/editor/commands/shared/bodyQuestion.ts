import type { Question } from '../EditorCommand.ts';

// Asked before a move between groups, or a Group, that changes the body some entities move with in play.
// The count is countBodyChanges'.
export function bodyQuestion(changeCount: number): Question {
    const entities = changeCount === 1 ? '1 entity' : `${changeCount} entities`;

    return {
        title: 'Move into another body?',
        text: `${entities} will move with a different body in play.`,
        confirmLabel: 'Move',
    };
}
