import { Link2, MousePointer2, Pencil, PenTool, Shapes, Type } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Ref } from 'react';
import { TOOL_KEYS, TOOL_NAMES } from '../../../../editor/tools/index.ts';
import type { ToolId } from '../../../../editor/tools/index.ts';
import { IconButton } from '../../../shared/index.ts';
import { TriggerIcon } from './triggerIcon.ts';
import './ToolButton.css';

export type ToolButtonProps = {
    toolId: ToolId;
    isActive: boolean;
    isLocked: boolean;
    // Given to the active tool's button, which its kinds menu stands beside.
    placeRef?: Ref<HTMLSpanElement> | undefined;
    onPick: () => void;
};

const TOOL_ICONS: Readonly<Record<ToolId, LucideIcon>> = {
    select: MousePointer2,
    pencil: Pencil,
    pen: PenTool,
    shape: Shapes,
    text: Type,
    joint: Link2,
    trigger: TriggerIcon,
};

// A tool's button with its number key in the tooltip. Tool lock shows as a small dot in its bottom
// right corner.
export function ToolButton({ toolId, isActive, isLocked, placeRef, onPick }: ToolButtonProps) {
    const label = TOOL_NAMES[toolId];
    const icon = TOOL_ICONS[toolId];
    const key = TOOL_KEYS[toolId];

    return (
        <span className="tool-button" ref={placeRef} data-tool={toolId} data-locked={isLocked}>
            <IconButton icon={icon} label={label} shortcut={key} isOn={isActive} look="island" onClick={onPick} />
        </span>
    );
}
