import { TriggerEdits } from '../../../../../../../../editor/entity-inspector/index.ts';
import type { TriggerBlock } from '../../../../../../../../editor/entity-inspector/index.ts';
import { useFieldTyping } from '../../../../../../../fields/index.ts';
import type { CommitTriggerEdit } from '../../../CommitTriggerEdit.ts';
import './TriggerNameBox.css';

export type TriggerNameBoxProps = {
    block: TriggerBlock;
    commit: CommitTriggerEdit;
};

// The trigger's name, typed like a card's text field: Enter, Tab or clicking away renames, Esc doesn't.
export function TriggerNameBox({ block, commit }: TriggerNameBoxProps) {
    const { index, name } = block;

    const rename = (typedName: string) => {
        if (typedName === name) return true;

        commit((component) => TriggerEdits.renamed(component, index, typedName));
        return true;
    };

    const typing = useFieldTyping({ shownText: name, fullText: name, commit: rename, onRestore: () => {} });

    return <input {...typing.inputProps} className="trigger-name-box" aria-label="Trigger name" />;
}
