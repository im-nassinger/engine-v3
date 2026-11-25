import { Ellipsis } from 'lucide-react';
import { TriggerEdits } from '../../../../../../../editor/entity-inspector/index.ts';
import type { TriggerBlock } from '../../../../../../../editor/entity-inspector/index.ts';
import { Icon, Menu, MenuButton, useOpenMenu } from '../../../../../../shared/index.ts';
import type { MenuEntry } from '../../../../../../shared/index.ts';
import type { CommitTriggerEdit } from '../../CommitTriggerEdit.ts';
import { TriggerDragGrip } from './TriggerDragGrip/index.ts';
import { TriggerNameBox } from './TriggerNameBox/index.ts';
import './TriggerHead.css';

export type TriggerHeadProps = {
    block: TriggerBlock;
    commit: CommitTriggerEdit;
};

// The trigger's two labelled rows, drawn like a card's fields (owner, 2026-11-25): Name, a box that renames
// it, with the grip that drags it to another place and its `…` menu; then Enabled, its on/off switch.
export function TriggerHead({ block, commit }: TriggerHeadProps) {
    const { index, name, isOn } = block;

    const switchTrigger = () => commit((component) => TriggerEdits.switched(component, index));
    const switchLabel = isOn ? `Switch off ${name}` : `Switch on ${name}`;
    const menu = <TriggerHeadMenu block={block} commit={commit} />;

    return (
        <div className="trigger-head">
            <span className="label">Name</span>
            <TriggerNameBox block={block} commit={commit} />
            <TriggerDragGrip block={block} commit={commit} />
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

function TriggerHeadMenu({ block, commit }: TriggerHeadProps) {
    const { close, anchor } = useOpenMenu();
    const { index } = block;

    const duplicate = () => commit((component) => TriggerEdits.duplicated(component, index));
    const remove = () => commit((component) => TriggerEdits.deleted(component, index));

    const entries: MenuEntry[] = [
        { kind: 'action', id: 'duplicate', label: 'Duplicate', onChoose: duplicate },
        { kind: 'action', id: 'delete', label: 'Delete', onChoose: remove },
    ];

    return <Menu entries={entries} onClose={close} anchor={anchor} align="end" />;
}
