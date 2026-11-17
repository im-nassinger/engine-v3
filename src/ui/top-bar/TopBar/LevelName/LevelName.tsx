import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { renameLevel } from '../../../../editor/commands/index.ts';
import type { Level } from '../../../../core/level/index.ts';
import { useEditorSession } from '../../../EditorContext.tsx';
import { useReading, useVersion } from '../../../hooks/index.ts';
import './LevelName.css';

// The level's name, a box that reads as text until clicked. Enter or leaving the box renames the level
// as one undo step, Esc puts the name back. A refused name shows its reason as status text. The
// browser tab's title is TabTitle's, in the page.
export function LevelName() {
    const session = useEditorSession();
    useVersion(session.openLevelChanged);
    const openLevel = session.openLevel;
    const level = openLevel.level;
    const name = useReading(level.signals.nameVersion, () => nameOf(level));

    const [draft, setDraft] = useState<string | undefined>(undefined);
    const skipsCommit = useRef(false);
    const shownText = draft ?? name;

    const commit = () => {
        if (draft === undefined) return;

        setDraft(undefined);
        const outcome = renameLevel(openLevel, draft);
        if (outcome.kind !== 'refused') return;

        session.status.show(outcome.reason);
    };

    const handleBlur = () => {
        if (skipsCommit.current) {
            skipsCommit.current = false;
            setDraft(undefined);
            return;
        }

        commit();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            skipsCommit.current = true;
            event.currentTarget.blur();
        }
    };

    const width = { width: `${Math.max(shownText.length, 1) + 1}ch` };

    return (
        <input
            className="level-name"
            aria-label="Level name"
            spellCheck={false}
            value={shownText}
            style={width}
            onFocus={() => setDraft(name)}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
        />
    );
}

// A call, not level.name read in place: the React Compiler would keep a closure reading level.name while
// the name stays the same, so after New swaps in a level of the same name an Undo of a rename would be
// read from the old level and never shown.
function nameOf(level: Level) {
    return level.name;
}
