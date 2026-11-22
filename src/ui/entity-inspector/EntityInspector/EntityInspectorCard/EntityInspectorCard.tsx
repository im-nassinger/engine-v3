import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ComponentTypeName } from '../../../../core/components/index.ts';
import type { EntityId } from '../../../../core/level/index.ts';
import type { CardModel, CardNote, FieldModel } from '../../../../editor/entity-inspector/index.ts';
import type { OpenLevel } from '../../../../editor/session/index.ts';
import { useEditorSession } from '../../../EditorContext.tsx';
import { Icon } from '../../../shared/index.ts';
import { CardField } from './CardField/index.ts';
import { CardMenu } from './CardMenu/index.ts';
import { CardNoteBox } from './CardNoteBox/index.ts';
import { TriggerCard } from './TriggerCard/index.ts';
import './EntityInspectorCard.css';

export type EntityInspectorCardProps = {
    openLevel: OpenLevel;
    card: CardModel;
    // The shown entities, which Remove, Reset and a note's fix work on.
    entityIds: readonly EntityId[];
};

type CardRow =
    | { readonly kind: 'field'; readonly key: string; readonly field: FieldModel }
    | { readonly kind: 'note'; readonly key: string; readonly note: CardNote };

// One component: its title, which folds it, its `…` menu, then its fields, each with the notes about it
// under it. Notes about the whole card come first. The TriggerComponent's card draws its triggers as the
// trigger card, each note about one trigger under it.
export function EntityInspectorCard({ openLevel, card, entityIds }: EntityInspectorCardProps) {
    const session = useEditorSession();

    const toggleFold = () => session.cardFolds.setFolded(card.typeName, !card.isFolded);

    const foldIcon = card.isFolded ? ChevronRight : ChevronDown;
    const rows = cardRows(card);
    const rowProps = { openLevel, typeName: card.typeName, entityIds };
    const isTriggerCard = card.typeName === 'TriggerComponent';
    const showsTriggers = isTriggerCard && !card.isFolded;

    return (
        <div className="entity-inspector-card" data-type={card.typeName}>
            <div className="head">
                <button type="button" className="title" aria-expanded={!card.isFolded} onClick={toggleFold}>
                    <Icon icon={foldIcon} size="small" />
                    <span className="name">{card.title}</span>
                </button>
                <CardMenu openLevel={openLevel} card={card} entityIds={entityIds} />
            </div>
            {!card.isFolded && rows.map((row) => <CardRowView key={row.key} {...rowProps} row={row} />)}
            {showsTriggers && <TriggerCard openLevel={openLevel} entityIds={entityIds} notes={card.notes} />}
        </div>
    );
}

type CardRowViewProps = {
    openLevel: OpenLevel;
    typeName: ComponentTypeName;
    entityIds: readonly EntityId[];
    row: CardRow;
};

function CardRowView({ openLevel, typeName, entityIds, row }: CardRowViewProps) {
    if (row.kind === 'field') {
        return <CardField openLevel={openLevel} typeName={typeName} entityIds={entityIds} field={row.field} />;
    }

    return <CardNoteBox openLevel={openLevel} note={row.note} />;
}

function cardRows(card: CardModel) {
    const rows: CardRow[] = [];

    const wholeCardNotes = card.notes.filter((note) => note.fieldKey === undefined);
    for (const note of wholeCardNotes) {
        rows.push(noteRow(note));
    }

    // The trigger card draws the triggers and their notes itself.
    if (card.typeName === 'TriggerComponent') return rows;

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
