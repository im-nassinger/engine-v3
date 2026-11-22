import { X } from 'lucide-react';
import { TriggerEdits } from '../../../../../../../../editor/entity-inspector/index.ts';
import type { TriggerRow, TriggerWord } from '../../../../../../../../editor/entity-inspector/index.ts';
import { Icon } from '../../../../../../../shared/index.ts';
import type { CommitTriggerEdit } from '../../../CommitTriggerEdit.ts';
import { TriggerSlotWord } from './TriggerSlotWord/index.ts';
import './TriggerSentenceRow.css';

export type TriggerSentenceRowProps = {
    row: TriggerRow;
    triggerIndex: number;
    commit: CommitTriggerEdit;
};

// One sentence, wrapping when it must: plain words, and words that open a menu or a small field. A check
// or an action shows an × at the right on hover, which removes it.
export function TriggerSentenceRow({ row, triggerIndex, commit }: TriggerSentenceRowProps) {
    const { part, sentence, canRemove } = row;

    const remove = () => {
        if (part.section !== 'check' && part.section !== 'action') return;

        commit((component) => TriggerEdits.removed(component, triggerIndex, part));
    };

    return (
        <div className="trigger-sentence-row" data-can-remove={canRemove}>
            {sentence.words.map((word, wordIndex) => (
                <SentenceWord key={wordIndex} word={word} triggerIndex={triggerIndex} commit={commit} />
            ))}
            {canRemove && (
                <button type="button" className="remove" aria-label={`Remove ${sentence.text}`} onClick={remove}>
                    <Icon icon={X} size="small" />
                </button>
            )}
        </div>
    );
}

type SentenceWordProps = {
    word: TriggerWord;
    triggerIndex: number;
    commit: CommitTriggerEdit;
};

function SentenceWord({ word, triggerIndex, commit }: SentenceWordProps) {
    if (word.kind === 'text') return <span className="text">{word.text}</span>;

    return <TriggerSlotWord word={word} triggerIndex={triggerIndex} commit={commit} />;
}
