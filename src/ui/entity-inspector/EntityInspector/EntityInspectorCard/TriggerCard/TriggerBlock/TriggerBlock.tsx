import type { TriggerBlock as TriggerBlockModel } from '../../../../../../editor/entity-inspector/index.ts';
import type { OpenLevel } from '../../../../../../editor/session/index.ts';
import { CardNoteBox } from '../../CardNoteBox/index.ts';
import type { CommitTriggerEdit } from '../CommitTriggerEdit.ts';
import { TriggerHead } from './TriggerHead/index.ts';
import { TriggerSection } from './TriggerSection/index.ts';
import './TriggerBlock.css';

export type TriggerBlockProps = {
    openLevel: OpenLevel;
    block: TriggerBlockModel;
    commit: CommitTriggerEdit;
};

// One trigger: its head, then When, If, Do and Repeat, then the notes about it. An off trigger's sections
// fade.
export function TriggerBlock({ openLevel, block, commit }: TriggerBlockProps) {
    return (
        <div className="trigger-block" data-trigger-index={block.index} data-on={block.isOn}>
            <TriggerHead block={block} commit={commit} />
            {block.sections.map((section) => (
                <TriggerSection
                    key={section.title}
                    openLevel={openLevel}
                    section={section}
                    triggerIndex={block.index}
                    commit={commit}
                />
            ))}
            {block.notes.map((note) => (
                <CardNoteBox key={note.text} openLevel={openLevel} note={note} />
            ))}
        </div>
    );
}
