import { ChevronDown, ChevronRight } from 'lucide-react';
import type { EntityId } from '../../../../core/level/index.ts';
import type { CardModel, CardNote, FieldModel } from '../../../../editor/inspector/index.ts';
import type { OpenLevel } from '../../../../editor/session/index.ts';
import { useEditorSession } from '../../../EditorContext.tsx';
import { Icon } from '../../../shared/index.ts';
import { CardField } from './CardField/index.ts';
import { CardMenu } from './CardMenu/index.ts';
import { CardNoteBox } from './CardNoteBox/index.ts';
import './InspectorCard.css';

export type InspectorCardProps = {
    openLevel: OpenLevel;
    card: CardModel;
    // The shown entities, which Remove, Reset and a note's fix work on.
    entityIds: readonly EntityId[];
};

type CardRow =
    | { readonly kind: 'field'; readonly key: string; readonly field: FieldModel }
    | { readonly kind: 'note'; readonly key: string; readonly note: CardNote };

// One component: its title, which folds it, its `…` menu, then its fields, each with the notes about it
// under it. Notes about the whole card come first.
export function InspectorCard({ openLevel, card, entityIds }: InspectorCardProps) {
    const session = useEditorSession();

    const toggleFold = () => session.cardFolds.setFolded(card.typeName, !card.isFolded);

    const foldIcon = card.isFolded ? ChevronRight : ChevronDown;
    const rows = cardRows(card);

    return (
        <div className="inspector-card" data-type={card.typeName}>
            <div className="head">
                <button type="button" className="title" aria-expanded={!card.isFolded} onClick={toggleFold}>
                    <Icon icon={foldIcon} size="small" />
                    <span className="name">{card.typeName}</span>
                </button>
                <CardMenu openLevel={openLevel} card={card} entityIds={entityIds} />
            </div>
            {!card.isFolded && rows.map((row) => <CardRowView key={row.key} openLevel={openLevel} row={row} />)}
        </div>
    );
}

type CardRowViewProps = {
    openLevel: OpenLevel;
    row: CardRow;
};

function CardRowView({ openLevel, row }: CardRowViewProps) {
    if (row.kind === 'field') return <CardField field={row.field} />;

    return <CardNoteBox openLevel={openLevel} note={row.note} />;
}

function cardRows(card: CardModel) {
    const rows: CardRow[] = [];

    const wholeCardNotes = card.notes.filter((note) => note.fieldKey === undefined);
    for (const note of wholeCardNotes) {
        rows.push(noteRow(note));
    }

    for (const field of card.fields) {
        const key = field.definition.key;
        rows.push({ kind: 'field', key: `field:${key}`, field });

        const fieldNotes = card.notes.filter((note) => note.fieldKey === key);
        for (const note of fieldNotes) {
            rows.push(noteRow(note));
        }
    }

    return rows;
}

function noteRow(note: CardNote): CardRow {
    const key = `note:${note.fieldKey ?? ''}:${note.text}`;

    return { kind: 'note', key, note };
}
