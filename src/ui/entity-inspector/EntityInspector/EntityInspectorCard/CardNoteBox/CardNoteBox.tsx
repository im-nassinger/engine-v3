import { Lightbulb, TriangleAlert } from 'lucide-react';
import { applyMessageFix } from '../../../../../editor/commands/index.ts';
import type { CardNote } from '../../../../../editor/entity-inspector/index.ts';
import type { MessageFix } from '../../../../../editor/messages/index.ts';
import type { OpenLevel } from '../../../../../editor/session/index.ts';
import { useEditorSession } from '../../../../EditorContext.tsx';
import { Icon } from '../../../../shared/index.ts';
import './CardNoteBox.css';

export type CardNoteBoxProps = {
    openLevel: OpenLevel;
    note: CardNote;
};

// An editor message on its card: the icon, the sentence and its fix as a link, such as "Needs a
// Surface to collide. Add Surface". The fix runs on every entity the note is about.
export function CardNoteBox({ openLevel, note }: CardNoteBoxProps) {
    const icon = note.kind === 'warning' ? TriangleAlert : Lightbulb;

    return (
        <div className="card-note-box" data-kind={note.kind} role="note">
            <span className="mark">
                <Icon icon={icon} size="small" />
            </span>
            <span className="text">
                {note.text} {note.fix && <FixLink openLevel={openLevel} fix={note.fix} note={note} />}
            </span>
        </div>
    );
}

type FixLinkProps = {
    openLevel: OpenLevel;
    fix: MessageFix;
    note: CardNote;
};

function FixLink({ openLevel, fix, note }: FixLinkProps) {
    const session = useEditorSession();

    const applyFix = () => {
        const outcome = applyMessageFix(openLevel, fix, note.entityIds);
        if (outcome.kind !== 'refused') return;

        session.status.show(outcome.reason);
    };

    return (
        <button type="button" className="fix" onClick={applyFix}>
            {fix.label}
        </button>
    );
}
