import type { ToolId } from './Tool.ts';

// Each tool's name, as its button's tooltip and the shortcut list show it.
export const TOOL_NAMES: Readonly<Record<ToolId, string>> = {
    select: 'Select',
    pencil: 'Pencil',
    pen: 'Bézier pen',
    shape: 'Shape',
    text: 'Text',
    joint: 'Joint',
    trigger: 'Trigger',
};
