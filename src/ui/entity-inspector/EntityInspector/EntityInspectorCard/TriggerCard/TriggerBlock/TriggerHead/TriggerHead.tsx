import { Ellipsis } from 'lucide-react';
import { TriggerEdits } from '../../../../../../../editor/entity-inspector/index.ts';
import type { TriggerBlock } from '../../../../../../../editor/entity-inspector/index.ts';
import { Icon, Menu, MenuButton, useOpenMenu } from '../../../../../../shared/index.ts';
import type { MenuEntry } from '../../../../../../shared/index.ts';
import type { CommitTriggerEdit } from '../../CommitTriggerEdit.ts';
import { TriggerNameBox } from './TriggerNameBox/index.ts';
import './TriggerHead.css';

export type TriggerHeadProps = {
    block: TriggerBlock;
    // How many triggers the entity has, so the last can't move down.
    triggerCount: number;
    commit: CommitTriggerEdit;
    // Opens the trigger in its own window; absent in that window.
    onOpenWindow?: () => void;
};

// The trigger's two labelled rows, drawn like a card's fields (owner, 2026-11-25): Name, a box that renames
// it, with its `…` menu; then Enabled, its on/off switch.
export function TriggerHead(props: TriggerHeadProps) {
    const { block, commit } = props;
    const { index, name, isOn } = block;

    const switchTrigger = () => commit((component) => TriggerEdits.switched(component, index));
    const switchLabel = isOn ? `Switch off ${name}` : `Switch on ${name}`;
    const menu = <TriggerHeadMenu {...props} />;

    return (
        <div className="trigger-head">
            <span className="label">Name</span>
            <TriggerNameBox block={block} commit={commit} />
            <MenuButton label={`${name} menu`} menu={menu} look="quiet">
                <Icon icon={Ellipsis} />
            </MenuButton>
            <span className="label">Enabled</span>
            <button
                type="button"
                className="switch"
                role="switch"
                aria-checked={isOn}
                aria-label={switchLabel}
                onClick={switchTrigger}
            />
        </div>
    );
}

// Move up and Move down also change when it runs (owner, 2026-11-26: they replace the drag grip).
function TriggerHeadMenu({ block, triggerCount, commit, onOpenWindow }: TriggerHeadProps) {
    const { close, anchor } = useOpenMenu();
    const { index } = block;

    const moveTo = (toIndex: number) => commit((component) => TriggerEdits.moved(component, index, toIndex));
    const moveUpReason = index === 0 ? 'Already the first trigger' : undefined;
    const moveDownReason = index === triggerCount - 1 ? 'Already the last trigger' : undefined;
    const duplicate = () => commit((component) => TriggerEdits.duplicated(component, index));
    const remove = () => commit((component) => TriggerEdits.deleted(component, index));

    const entries: MenuEntry[] = [];
    if (onOpenWindow !== undefined) {
        entries.push({ kind: 'action', id: 'open-window', label: 'Open in window', onChoose: onOpenWindow });
        entries.push({ kind: 'separator', id: 'separator-window' });
    }
    entries.push(
        {
            kind: 'action',
            id: 'move-up',
            label: 'Move up',
            onChoose: () => moveTo(index - 1),
            disabledReason: moveUpReason,
        },
        {
            kind: 'action',
            id: 'move-down',
            label: 'Move down',
            onChoose: () => moveTo(index + 1),
            disabledReason: moveDownReason,
        },
        { kind: 'action', id: 'duplicate', label: 'Duplicate', onChoose: duplicate },
        { kind: 'action', id: 'delete', label: 'Delete', onChoose: remove },
    );

    return <Menu entries={entries} onClose={close} anchor={anchor} align="end" />;
}
