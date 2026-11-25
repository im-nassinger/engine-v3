import type { TriggerBlock as TriggerBlockModel } from '../../../../../../editor/entity-inspector/index.ts';
import type { OpenLevel } from '../../../../../../editor/session/index.ts';
import { CardNoteBox } from '../../CardNoteBox/index.ts';
import type { CommitTriggerEdit } from '../CommitTriggerEdit.ts';
import { TriggerHead } from './TriggerHead/index.ts';
import { TriggerScriptBox } from './TriggerScriptBox/index.ts';
import './TriggerBlock.css';

export type TriggerBlockProps = {
    openLevel: OpenLevel;
    block: TriggerBlockModel;
    commit: CommitTriggerEdit;
};

// One trigger: its head, then its script of Scratch blocks (v4 fix 4), then the notes about it. An off
// trigger's script fades.
export function TriggerBlock({ openLevel, block, commit }: TriggerBlockProps) {
    return (
        <div className="trigger-block" data-trigger-index={block.index} data-on={block.isOn}>
            <TriggerHead block={block} commit={commit} />
            <TriggerScriptBox openLevel={openLevel} script={block.script} triggerIndex={block.index} commit={commit} />
            {block.notes.map((note) => (
                <CardNoteBox key={note.text} openLevel={openLevel} note={note} />
            ))}
        </div>
    );
}
