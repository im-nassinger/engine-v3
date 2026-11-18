import { useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { renameEntity } from '../../../../../../editor/commands/index.ts';
import type { EntityId } from '../../../../../../core/level/index.ts';
import type { OpenLevel } from '../../../../../../editor/session/index.ts';
import { useEditorSession } from '../../../../../EditorContext.tsx';
import './RowNameBox.css';

export type RowNameBoxProps = {
    openLevel: OpenLevel;
    entityId: EntityId;
    name: string;
    // Called once the box closes, committed or not.
    onClose: () => void;
};

// A row's name while it is renamed. Enter or leaving the box renames the entity as one undo step, Esc
// keeps the old name. A refused name shows its reason as status text.
export function RowNameBox({ openLevel, entityId, name, onClose }: RowNameBoxProps) {
    const session = useEditorSession();
    const [draft, setDraft] = useState(name);
    const skipsCommit = useRef(false);

    const handleBlur = () => {
        onClose();
        if (skipsCommit.current) return;

        const outcome = renameEntity(openLevel, entityId, draft);
        if (outcome.kind !== 'refused') return;

        session.status.show(outcome.reason);
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

    // A click in the box places the caret; it must not reach the row and change the selection.
    const keepClickInBox = (event: MouseEvent) => event.stopPropagation();

    return (
        <input
            className="row-name-box"
            aria-label="Entity name"
            spellCheck={false}
            autoFocus
            value={draft}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={keepClickInBox}
            onDoubleClick={keepClickInBox}
        />
    );
}
