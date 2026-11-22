import type { TriggerSection as TriggerSectionModel } from '../../../../../../../editor/entity-inspector/index.ts';
import type { CommitTriggerEdit } from '../../CommitTriggerEdit.ts';
import { TriggerAddRow } from './TriggerAddRow/index.ts';
import { TriggerSentenceRow } from './TriggerSentenceRow/index.ts';
import './TriggerSection.css';

export type TriggerSectionProps = {
    section: TriggerSectionModel;
    triggerIndex: number;
    commit: CommitTriggerEdit;
};

// When, If, Do or Repeat: a small-caps title with its hint at the right, over full-width rows of one
// sentence each, and Add check or Add action at the end of If and Do.
export function TriggerSection({ section, triggerIndex, commit }: TriggerSectionProps) {
    const rowProps = { triggerIndex, commit };

    return (
        <div className="trigger-section" data-section={section.title}>
            <div className="title">
                <span>{section.title}</span>
                {section.hint !== undefined && <span className="hint">{section.hint}</span>}
            </div>
            {section.rows.map((row, rowIndex) => (
                <TriggerSentenceRow key={rowIndex} row={row} {...rowProps} />
            ))}
            {section.addRow && <TriggerAddRow addRow={section.addRow} {...rowProps} />}
        </div>
    );
}
