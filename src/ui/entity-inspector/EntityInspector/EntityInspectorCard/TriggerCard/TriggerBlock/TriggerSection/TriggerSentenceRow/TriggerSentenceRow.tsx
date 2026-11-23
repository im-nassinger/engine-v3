import { X } from 'lucide-react';
import { TriggerEdits } from '../../../../../../../../editor/entity-inspector/index.ts';
import type { TriggerRow, TriggerWord } from '../../../../../../../../editor/entity-inspector/index.ts';
import { Icon, Tooltip } from '../../../../../../../shared/index.ts';
import type { OpenLevel } from '../../../../../../../../editor/session/index.ts';
import type { CommitTriggerEdit } from '../../../CommitTriggerEdit.ts';
import { TriggerSlotWord } from './TriggerSlotWord/index.ts';
import './TriggerSentenceRow.css';

export type TriggerSentenceRowProps = {
    openLevel: OpenLevel;
    row: TriggerRow;
    triggerIndex: number;
    commit: CommitTriggerEdit;
};

// One sentence, wrapping when it must: plain words, and words that open a menu or a small field. A check
// or an action shows an × at the right on hover, which removes it. A Wait with actions after it has a faint
// line under it, so they read as a later moment.
export function TriggerSentenceRow({ openLevel, row, triggerIndex, commit }: TriggerSentenceRowProps) {
    const { part, sentence, canRemove, hasWaitLine } = row;

    const remove = () => {
        if (part.section !== 'check' && part.section !== 'action') return;

        commit((component) => TriggerEdits.removed(component, triggerIndex, part));
    };

    return (
        <div className="trigger-sentence-row" data-can-remove={canRemove} data-wait-line={hasWaitLine}>
            {sentence.words.map((word, wordIndex) => (
                <SentenceWord
                    key={wordKey(word, wordIndex)}
                    openLevel={openLevel}
                    word={word}
                    triggerIndex={triggerIndex}
                    commit={commit}
                />
            ))}
            {canRemove && <RemoveButton label={`Remove ${sentence.text}`} onRemove={remove} />}
        </div>
    );
}

// A word keeps its place and its slot, so a word that becomes another slot is a new one.
function wordKey(word: TriggerWord, wordIndex: number) {
    if (word.kind === 'text') return `${wordIndex}-text`;

    return `${wordIndex}-${word.address.slot}`;
}

type SentenceWordProps = {
    openLevel: OpenLevel;
    word: TriggerWord;
    triggerIndex: number;
    commit: CommitTriggerEdit;
};

function SentenceWord({ openLevel, word, triggerIndex, commit }: SentenceWordProps) {
    if (word.kind === 'text') return <span className="text">{word.text}</span>;

    return <TriggerSlotWord openLevel={openLevel} word={word} triggerIndex={triggerIndex} commit={commit} />;
}

type RemoveButtonProps = {
    label: string;
    onRemove: () => void;
};

function RemoveButton({ label, onRemove }: RemoveButtonProps) {
    return (
        <span className="remove">
            <Tooltip label={label}>
                <button type="button" aria-label={label} onClick={onRemove}>
                    <Icon icon={X} size="small" />
                </button>
            </Tooltip>
        </span>
    );
}
