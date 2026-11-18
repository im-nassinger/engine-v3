import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { renameEntity } from '../../../../../editor/commands/index.ts';
import type { EntityId } from '../../../../../core/level/index.ts';
import type { OpenLevel } from '../../../../../editor/session/index.ts';
import { useEditorSession } from '../../../../EditorContext.tsx';
import './HeadNameBox.css';

export type HeadNameBoxProps = {
    openLevel: OpenLevel;
    entityId: EntityId;
    name: string;
};

// The shown entity's name, always in its box. Enter or leaving the box renames it as one undo step, and
// Esc puts the old name back. A refused name shows its reason as status text and the old name returns.
export function HeadNameBox({ openLevel, entityId, name }: HeadNameBoxProps) {
    const session = useEditorSession();
    const [draft, setDraft] = useState(name);
    const skipsCommit = useRef(false);

    const handleBlur = () => {
        if (skipsCommit.current) {
            skipsCommit.current = false;
            setDraft(name);
            return;
        }

        if (draft === name) return;

        const outcome = renameEntity(openLevel, entityId, draft);
        if (outcome.kind !== 'refused') return;

        session.status.show(outcome.reason);
        setDraft(name);
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

    return (
        <input
            className="head-name-box"
            aria-label="Entity name"
            spellCheck={false}
            value={draft}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
        />
    );
}
