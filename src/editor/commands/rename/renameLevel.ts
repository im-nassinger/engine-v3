import { Level } from '../../../core/level/index.ts';
import { RenameLevelChange } from '../../history/index.ts';
import type { EditOutcome } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

// The top bar's level name. Trimmed like an entity's name: an empty one keeps the old name and makes no
// step, and a longer one is refused, not cut, so the old name stays.
export function renameLevel(openLevel: OpenLevel, text: string): EditOutcome {
    const { level, editor } = openLevel;

    const newName = text.trim();
    if (newName.length === 0) return { kind: 'done' };

    const characterCount = Array.from(newName).length;
    if (characterCount > Level.maxNameLength) {
        return { kind: 'refused', reason: `A level name can be at most ${Level.maxNameLength} characters` };
    }

    if (newName === level.name) return { kind: 'done' };

    const change = new RenameLevelChange(level.name, newName);

    return editor.edit('Rename level', (transaction) => {
        transaction.apply(change);
        return { kind: 'done' };
    });
}
