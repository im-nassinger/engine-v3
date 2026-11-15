import type { ToolId } from './Tool.ts';

// The requirement's number keys, written as shortcuts are ('1'). The keys of v2's tools are kept free
// now, so nothing is relearned when they come.
export const TOOL_KEYS: Readonly<Record<ToolId, string>> = {
    select: '1',
    pencil: '2',
    pen: '3',
    shape: '4',
    text: '5',
    joint: '6',
    trigger: '7',
};
