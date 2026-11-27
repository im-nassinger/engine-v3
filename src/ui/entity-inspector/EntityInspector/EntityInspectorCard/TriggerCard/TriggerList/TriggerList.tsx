import { useEffect, useReducer, useRef, useState } from 'react';
import type { Trigger } from '../../../../../../core/fields/index.ts';
import type { TriggerCardModel } from '../../../../../../editor/entity-inspector/index.ts';
import type { OpenLevel } from '../../../../../../editor/session/index.ts';
import type { CommitTriggerEdit } from '../CommitTriggerEdit.ts';
import { TriggerBlock } from '../TriggerBlock/index.ts';
import { NearView } from './near-view/NearView.ts';
import { TriggerPlaceholder } from './TriggerPlaceholder/index.ts';
import './TriggerList.css';

export type TriggerListProps = {
    openLevel: OpenLevel;
    model: TriggerCardModel;
    commit: CommitTriggerEdit;
    onOpenWindow: (triggerId: number) => void;
};

// A placeholder's height before its trigger was ever drawn, as TriggerScriptBox.css lays it out: the head
// and the block's padding, then the script, 34 px a Scratch block and 12 px more, between 4 and 10 blocks
// tall. A trigger's notes are left out.
const HEAD_PX = 76;
const SCRIPT_BLOCK_PX = 34;
const SCRIPT_ENDS_PX = 12;
const SCRIPT_LEAST_BLOCKS = 4;
const SCRIPT_MOST_BLOCKS = 10;

// The card's triggers in order. Only those near the view are built and drawn (NearView); the others are
// placeholders, drawn as the panel scrolls to them. One list per entity, so nothing carries over to another.
export function TriggerList({ openLevel, model, commit, onOpenWindow }: TriggerListProps) {
    'use no memo';

    const [, redraw] = useReducer((count: number) => count + 1, 0);
    const [nearView] = useState(() => new NearView(redraw));
    const listRef = useRef<HTMLDivElement>(null);
    const idsKey = model.ids.join(',');

    useEffect(() => {
        nearView.watch(listRef.current);
        return () => nearView.dispose();
    }, [nearView, idsKey]);

    const itemProps = { openLevel, model, commit, onOpenWindow };

    return (
        <div className="trigger-list" ref={listRef}>
            {model.ids.map((id, index) => (
                <TriggerListItem
                    key={id}
                    id={id}
                    index={index}
                    isNear={nearView.isNear(id, index)}
                    drawnHeightPx={nearView.heightOf(id)}
                    {...itemProps}
                />
            ))}
        </div>
    );
}

type TriggerListItemProps = TriggerListProps & {
    id: number;
    index: number;
    isNear: boolean;
    drawnHeightPx: number | undefined;
};

// The trigger's place in the list, which NearView watches: its block, or its placeholder while it is far.
function TriggerListItem(props: TriggerListItemProps) {
    'use no memo';

    const { openLevel, model, commit, onOpenWindow, id, index, isNear, drawnHeightPx } = props;
    const heightPx = drawnHeightPx ?? estimatedHeightOf(model.triggerAt(index));

    return (
        <div className="trigger-list-item" data-trigger-id={id} data-drawn={isNear}>
            {!isNear && <TriggerPlaceholder heightPx={heightPx} />}
            {isNear && (
                <TriggerBlock
                    openLevel={openLevel}
                    block={model.blockAt(index)}
                    triggerCount={model.ids.length}
                    commit={commit}
                    onOpenWindow={() => onOpenWindow(id)}
                />
            )}
        </div>
    );
}

// The event block, the If's two bars when it has checks, then the actions.
function estimatedHeightOf(trigger: Trigger) {
    let scriptBlocks = 1 + trigger.actions.length;
    if (trigger.checks.length > 0) {
        scriptBlocks += 2;
    }

    const shownBlocks = Math.min(Math.max(scriptBlocks, SCRIPT_LEAST_BLOCKS), SCRIPT_MOST_BLOCKS);

    return HEAD_PX + shownBlocks * SCRIPT_BLOCK_PX + SCRIPT_ENDS_PX;
}
