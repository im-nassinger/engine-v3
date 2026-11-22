import { Ellipsis } from 'lucide-react';
import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { TriggerEdits } from '../../../../../../../editor/entity-inspector/index.ts';
import type { TriggerBlock } from '../../../../../../../editor/entity-inspector/index.ts';
import { Icon, Menu, MenuButton, useOpenMenu } from '../../../../../../shared/index.ts';
import type { MenuEntry } from '../../../../../../shared/index.ts';
import type { CommitTriggerEdit } from '../../CommitTriggerEdit.ts';
import './TriggerHead.css';

export type TriggerHeadProps = {
    block: TriggerBlock;
    commit: CommitTriggerEdit;
};

// The trigger's name, the handle that drags it to another place, its on/off switch, and its `…` menu with
// Rename, Duplicate and Delete. Rename turns the name into a box: Enter or leaving it renames, Esc doesn't.
export function TriggerHead({ block, commit }: TriggerHeadProps) {
    const [isRenaming, setIsRenaming] = useState(false);
    const { index, name, isOn } = block;

    const switchTrigger = () => commit((component) => TriggerEdits.switched(component, index));
    const switchLabel = isOn ? `Switch off ${name}` : `Switch on ${name}`;

    const rename = (typedName: string) => {
        setIsRenaming(false);
        if (typedName === name) return;

        commit((component) => TriggerEdits.renamed(component, index, typedName));
    };

    const menu = <TriggerHeadMenu block={block} commit={commit} onRename={() => setIsRenaming(true)} />;

    return (
        <div className="trigger-head">
            {isRenaming && <NameBox name={name} onRename={rename} onCancel={() => setIsRenaming(false)} />}
            {!isRenaming && <DragName block={block} commit={commit} />}
            <button
                type="button"
                className="switch"
                role="switch"
                aria-checked={isOn}
                aria-label={switchLabel}
                onClick={switchTrigger}
            />
            <MenuButton label={`${name} menu`} menu={menu} look="quiet">
                <Icon icon={Ellipsis} />
            </MenuButton>
        </div>
    );
}

type DragNameProps = TriggerHeadProps;

// Dropped on another trigger's block, the trigger takes its place, which also changes when it runs.
function DragName({ block, commit }: DragNameProps) {
    const startDrag = (event: PointerEvent<HTMLSpanElement>) => {
        if (event.button !== 0) return;

        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const drop = (event: PointerEvent<HTMLSpanElement>) => {
        const handle = event.currentTarget;
        if (!handle.hasPointerCapture(event.pointerId)) return;

        handle.releasePointerCapture(event.pointerId);
        const under = document.elementFromPoint(event.clientX, event.clientY);
        const blockUnder = under?.closest<HTMLElement>('.trigger-block');
        const indexText = blockUnder?.dataset['triggerIndex'];
        if (indexText === undefined) return;

        const toIndex = Number(indexText);
        commit((component) => TriggerEdits.moved(component, block.index, toIndex));
    };

    return (
        <span
            className="name"
            title="Drag to reorder: it also changes when it runs"
            onPointerDown={startDrag}
            onPointerUp={drop}
        >
            {block.name}
        </span>
    );
}

type NameBoxProps = {
    name: string;
    onRename: (typedName: string) => void;
    onCancel: () => void;
};

function NameBox({ name, onRename, onCancel }: NameBoxProps) {
    const [text, setText] = useState(name);
    // Enter or Esc ends the box, and the blur that follows its removal must not rename again.
    const isDoneRef = useRef(false);

    const finish = (finishing: () => void) => {
        if (isDoneRef.current) return;

        isDoneRef.current = true;
        finishing();
    };

    const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (event.key === 'Enter') {
            finish(() => onRename(text));
        } else if (event.key === 'Escape') {
            event.preventDefault();
            finish(onCancel);
        }
    };

    return (
        <input
            className="name-box"
            aria-label="Trigger name"
            value={text}
            autoFocus
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKey}
            onBlur={() => finish(() => onRename(text))}
        />
    );
}

type TriggerHeadMenuProps = TriggerHeadProps & {
    onRename: () => void;
};

function TriggerHeadMenu({ block, commit, onRename }: TriggerHeadMenuProps) {
    const { close, anchor } = useOpenMenu();
    const { index } = block;

    const duplicate = () => commit((component) => TriggerEdits.duplicated(component, index));
    const remove = () => commit((component) => TriggerEdits.deleted(component, index));

    const entries: MenuEntry[] = [
        { kind: 'action', id: 'rename', label: 'Rename', onChoose: onRename },
        { kind: 'action', id: 'duplicate', label: 'Duplicate', onChoose: duplicate },
        { kind: 'action', id: 'delete', label: 'Delete', onChoose: remove },
    ];

    return <Menu entries={entries} onClose={close} anchor={anchor} align="end" />;
}
