import { GripVertical } from 'lucide-react';
import type { PointerEvent } from 'react';
import { TriggerEdits } from '../../../../../../../../editor/entity-inspector/index.ts';
import type { TriggerBlock } from '../../../../../../../../editor/entity-inspector/index.ts';
import { Icon } from '../../../../../../../shared/index.ts';
import type { CommitTriggerEdit } from '../../../CommitTriggerEdit.ts';
import './TriggerDragGrip.css';

export type TriggerDragGripProps = {
    block: TriggerBlock;
    commit: CommitTriggerEdit;
};

// Dropped on another trigger's block, the trigger takes its place, which also changes when it runs.
export function TriggerDragGrip({ block, commit }: TriggerDragGripProps) {
    const startDrag = (event: PointerEvent<HTMLSpanElement>) => {
        if (event.button !== 0) return;

        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const drop = (event: PointerEvent<HTMLSpanElement>) => {
        const grip = event.currentTarget;
        if (!grip.hasPointerCapture(event.pointerId)) return;

        grip.releasePointerCapture(event.pointerId);
        const under = document.elementFromPoint(event.clientX, event.clientY);
        const blockUnder = under?.closest<HTMLElement>('.trigger-block');
        const indexText = blockUnder?.dataset['triggerIndex'];
        if (indexText === undefined) return;

        const toIndex = Number(indexText);
        commit((component) => TriggerEdits.moved(component, block.index, toIndex));
    };

    return (
        <span
            className="trigger-drag-grip"
            title="Drag to reorder: it also changes when it runs"
            onPointerDown={startDrag}
            onPointerUp={drop}
        >
            <Icon icon={GripVertical} />
        </span>
    );
}
