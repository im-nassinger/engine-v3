import type { ToolId } from './Tool.ts';

// The number keys, written as shortcuts are ('1'), as the requirement gives them: v1's three tools take 1, 2 and 3
// (owner, 2026-11-19), the pen 4, the Pencil 5 and the Trigger tool 6 (v3, standing yes, 2026-11-22). Text is not
// built yet, so its 7 only holds a place until v6 decides.
export const TOOL_KEYS: Readonly<Record<ToolId, string>> = {
    select: '1',
    shape: '2',
    joint: '3',
    pen: '4',
    pencil: '5',
    trigger: '6',
    text: '7',
};
