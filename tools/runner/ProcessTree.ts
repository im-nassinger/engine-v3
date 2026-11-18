import fs from 'node:fs';

const KILL_GRACE_MS = 10 * 1000;

// Ends a process and every process under it. Claude starts its background shells in their
// own process groups, so killing the session's group alone would leave them running.
export function killProcessTree(rootProcessId: number) {
    const descendantIds = findDescendants(rootProcessId);
    const allIds = [...descendantIds, rootProcessId];

    signalEach(allIds, 'SIGTERM');

    const forceKill = () => signalEach(allIds, 'SIGKILL');
    setTimeout(forceKill, KILL_GRACE_MS).unref();
}

function findDescendants(rootProcessId: number) {
    const childrenByParent = readChildrenByParent();
    const descendantIds: number[] = [];
    const idsToVisit = [rootProcessId];

    while (idsToVisit.length > 0) {
        const parentId = idsToVisit.pop();
        if (parentId === undefined) break;

        const childIds = childrenByParent.get(parentId) ?? [];
        descendantIds.push(...childIds);
        idsToVisit.push(...childIds);
    }

    return descendantIds;
}

function readChildrenByParent() {
    const childrenByParent = new Map<number, number[]>();

    for (const entryName of fs.readdirSync('/proc')) {
        const processId = Number.parseInt(entryName, 10);
        if (Number.isNaN(processId)) continue;

        const parentId = readParentId(processId);
        if (parentId === undefined) continue;

        const siblingIds = childrenByParent.get(parentId) ?? [];
        siblingIds.push(processId);
        childrenByParent.set(parentId, siblingIds);
    }

    return childrenByParent;
}

// /proc/<id>/stat is "id (command) state parentId ...", and the command may itself hold
// spaces or parentheses, so the fields are read after the last ")".
function readParentId(processId: number) {
    let statText: string;
    try {
        statText = fs.readFileSync(`/proc/${processId}/stat`, 'utf8');
    } catch {
        return undefined;
    }

    const commandEnd = statText.lastIndexOf(')');
    const fieldsText = statText.slice(commandEnd + 2);
    const fields = fieldsText.split(' ');
    const parentId = Number.parseInt(fields[1] ?? '', 10);
    if (Number.isNaN(parentId)) return undefined;

    return parentId;
}

function signalEach(processIds: number[], signal: NodeJS.Signals) {
    for (const processId of processIds) {
        try {
            process.kill(processId, signal);
        } catch {
            // Already gone.
        }
    }
}
