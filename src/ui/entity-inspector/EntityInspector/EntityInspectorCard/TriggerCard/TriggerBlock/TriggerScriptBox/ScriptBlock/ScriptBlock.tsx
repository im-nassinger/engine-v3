import { X } from 'lucide-react';
import { useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import { TriggerEdits } from '../../../../../../../../editor/entity-inspector/index.ts';
import type {
    ScriptBlock as ScriptBlockModel,
    ScriptWordGroup,
    TriggerWord,
} from '../../../../../../../../editor/entity-inspector/index.ts';
import type { OpenLevel } from '../../../../../../../../editor/session/index.ts';
import { Icon, Tooltip } from '../../../../../../../shared/index.ts';
import type { CommitTriggerEdit } from '../../../CommitTriggerEdit.ts';
import { BlockContextMenu } from './BlockContextMenu/index.ts';
import type { ContextPart } from './BlockContextMenu/index.ts';
import { SCRIPT_ICONS } from './scriptIcons.ts';
import { TriggerSlotWord } from './TriggerSlotWord/index.ts';
import './ScriptBlock.css';

export type ScriptBlockProps = {
    openLevel: OpenLevel;
    block: ScriptBlockModel;
    triggerIndex: number;
    commit: CommitTriggerEdit;
    zIndex: number;
    // Nothing under it, so no tooth.
    isEnd: boolean;
    // The last block inside the If, whose bottom bar covers 2 px more of it.
    isLast: boolean;
    // The mouse is on the block, asking for a gap's slot (undefined for none).
    onHover: (gap: number | undefined, block: Element) => void;
};

type Band = 'top' | 'middle' | 'bottom';

type OpenContextMenu = {
    contextPart: ContextPart;
    point: { x: number; y: number };
    isReplaceOnly: boolean;
};

// How far the tooth hangs below the body; it is left out of the bands.
const TOOTH_PX = 6;

// The boxes a value box opens float over the card but sit inside its block, so the mouse moving over them
// reaches the block too; it is not on the block then, and must not open or close a slot under the box.
const FLOATING_BOXES = '.menu, .entity-picker, .trigger-word-field';

// One Scratch block (v4 fix 4): its body and tooth in its kind's colour, cut from its neighbours by a 2 px ring
// of the trigger's background, then its icon and words, each value box opening fix 2's picker or box. Its top
// third asks for the slot above it, its bottom third the slot below, its middle third (and any value box)
// none; the cursor says which. On the middle band a removable part shows its ×. A right click opens the
// context menu of the part under the mouse, and a click on the icon its Replace menu (owner, 2026-11-25).
export function ScriptBlock({ block, zIndex, isEnd, isLast, onHover, ...wordProps }: ScriptBlockProps) {
    const [band, setBand] = useState<Band | undefined>(undefined);
    const [contextMenu, setContextMenu] = useState<OpenContextMenu | undefined>(undefined);
    const icon = block.icon === undefined ? undefined : SCRIPT_ICONS[block.icon];

    const hover = (event: PointerEvent<HTMLDivElement>) => {
        if (isOnFloatingBox(event)) return;
        const hovered = bandAt(event, block);
        setBand(hovered);
        const gap = gapOf(hovered, block);
        onHover(gap, event.currentTarget);
    };

    const openContextMenu = (event: MouseEvent<HTMLDivElement>) => {
        if (isOnFloatingBox(event)) return;

        event.preventDefault();
        const contextPart = contextPartAt(event.target, block);
        if (contextPart === undefined) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        setContextMenu({ contextPart, point, isReplaceOnly: false });
    };

    // The menu opens under the icon, as a value box's menu opens under the box.
    const openReplaceMenu = (event: MouseEvent<HTMLButtonElement>) => {
        const contextPart = contextPartAt(event.target, block);
        if (contextPart === undefined) return;

        const iconRect = event.currentTarget.getBoundingClientRect();
        const blockElement = event.currentTarget.closest('.script-block');
        if (blockElement === null) return;

        const blockRect = blockElement.getBoundingClientRect();
        const point = { x: iconRect.left - blockRect.left, y: iconRect.bottom - blockRect.top };
        setContextMenu({ contextPart, point, isReplaceOnly: true });
    };

    return (
        <div
            className="script-block"
            data-shape={block.shape}
            data-colour={block.colour}
            data-end={isEnd}
            data-last={isLast}
            data-inside-if={block.isInsideIf}
            data-gap-above={block.gapAbove}
            data-gap-below={block.gapBelow}
            data-band={band}
            style={{ zIndex }}
            onPointerMove={hover}
            onPointerLeave={() => setBand(undefined)}
            onContextMenu={openContextMenu}
        >
            <i className="tooth" />
            {icon !== undefined && (
                <Tooltip label="Replace">
                    <button type="button" className="icon-button" aria-label="Replace" onClick={openReplaceMenu}>
                        <Icon icon={icon} />
                    </button>
                </Tooltip>
            )}
            {block.groups.map((group, groupIndex) => (
                <BlockGroup key={groupIndex} group={group} groupIndex={groupIndex} {...wordProps} />
            ))}
            {contextMenu && (
                <BlockContextMenu
                    {...contextMenu}
                    triggerIndex={wordProps.triggerIndex}
                    commit={wordProps.commit}
                    onClose={() => setContextMenu(undefined)}
                />
            )}
        </div>
    );
}

function isOnFloatingBox(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;

    return target instanceof Element && target.closest(FLOATING_BOXES) !== null;
}

function bandAt(event: PointerEvent<HTMLDivElement>, block: ScriptBlockModel): Band {
    const target = event.target;
    const onValue = target instanceof Element && target.closest('.trigger-slot-word, .remove, .icon-button') !== null;
    if (onValue) return 'middle';

    const rect = event.currentTarget.getBoundingClientRect();
    const bodyHeight = rect.height - TOOTH_PX;
    const y = event.clientY - rect.top;
    if (y < bodyHeight / 3 && block.gapAbove !== undefined) return 'top';
    if (y > (bodyHeight * 2) / 3 && block.gapBelow !== undefined) return 'bottom';

    return 'middle';
}

// The part under the mouse, or the block's first part, such as the If bar's first check under its "if".
// Undefined for a block with no part: the If's bottom bar.
function contextPartAt(target: EventTarget | null, block: ScriptBlockModel): ContextPart | undefined {
    const groupElement = target instanceof Element ? target.closest<HTMLElement>('.group') : null;
    const groupIndex = Number(groupElement?.dataset['group']);
    const hovered = block.groups[groupIndex];
    const parts = block.groups.filter((group) => group.part !== undefined);
    let group = parts[0];
    if (hovered?.part !== undefined) {
        group = hovered;
    }
    if (group?.part === undefined || group.replaceMenu === undefined) return undefined;

    return { part: group.part, canRemove: group.canRemove, replaceMenu: group.replaceMenu };
}

function gapOf(band: Band, block: ScriptBlockModel) {
    if (band === 'top') return block.gapAbove;
    if (band === 'bottom') return block.gapBelow;

    return undefined;
}

type WordProps = {
    openLevel: OpenLevel;
    triggerIndex: number;
    commit: CommitTriggerEdit;
};

type BlockGroupProps = WordProps & {
    group: ScriptWordGroup;
    groupIndex: number;
};

// One part's words, then its × when it can be removed. It lays out as the block's own words (display:
// contents), and says which part it is.
function BlockGroup({ group, groupIndex, ...wordProps }: BlockGroupProps) {
    const { part } = group;
    const label = `Remove ${group.words.map((word) => word.text).join(' ')}`;

    const remove = () => {
        if (part === undefined || part.section === 'when') return;

        wordProps.commit((component) => TriggerEdits.removed(component, wordProps.triggerIndex, part));
    };

    return (
        <span className="group" data-section={part?.section} data-group={groupIndex}>
            {group.words.map((word, wordIndex) => (
                <BlockWord key={wordKey(word, wordIndex)} word={word} {...wordProps} />
            ))}
            {group.canRemove && <RemoveButton label={label} onRemove={remove} />}
        </span>
    );
}

// A word keeps its place and its slot, so a word that becomes another slot is a new one.
function wordKey(word: TriggerWord, wordIndex: number) {
    if (word.kind === 'text') return `${wordIndex}-text`;

    return `${wordIndex}-${word.address.slot}`;
}

type BlockWordProps = WordProps & {
    word: TriggerWord;
};

function BlockWord({ word, ...wordProps }: BlockWordProps) {
    if (word.kind === 'text') {
        return (
            <span className="text" data-entity={word.isEntity === true}>
                {word.text}
            </span>
        );
    }

    return <TriggerSlotWord word={word} {...wordProps} />;
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
