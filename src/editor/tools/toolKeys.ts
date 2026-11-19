import type { ToolId } from './Tool.ts';

// The number keys, written as shortcuts are ('1'). v1's three tools take 1, 2 and 3 (owner, 2026-11-19);
// v2's tools are not built yet, so their keys only hold a place until v2 settles them.
export const TOOL_KEYS: Readonly<Record<ToolId, string>> = {
    select: '1',
    shape: '2',
    joint: '3',
    pencil: '4',
    pen: '5',
    text: '6',
    trigger: '7',
};
