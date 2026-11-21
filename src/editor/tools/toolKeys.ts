import type { ToolId } from './Tool.ts';

// The number keys, written as shortcuts are ('1'), as the requirement gives them: v1's three tools take 1, 2 and 3
// (owner, 2026-11-19), the pen 4 and the Pencil 5. Text and Trigger are not built yet, so theirs only hold a place.
export const TOOL_KEYS: Readonly<Record<ToolId, string>> = {
    select: '1',
    shape: '2',
    joint: '3',
    pen: '4',
    pencil: '5',
    text: '6',
    trigger: '7',
};
