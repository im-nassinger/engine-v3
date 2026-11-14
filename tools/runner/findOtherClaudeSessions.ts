import fs from 'node:fs';

// Claude processes already working in the project folder, such as a session the owner
// opened by hand. Two sessions editing the same files would undo each other's work.
export function findOtherClaudeSessions(projectFolder: string) {
    const processIds: number[] = [];

    for (const entry of fs.readdirSync('/proc')) {
        const processId = Number(entry);
        if (!Number.isInteger(processId) || processId === process.pid) continue;

        try {
            const command = fs.readFileSync(`/proc/${processId}/comm`, 'utf8').trim();
            if (command !== 'claude') continue;

            const workingFolder = fs.readlinkSync(`/proc/${processId}/cwd`);
            const isInProject = workingFolder === projectFolder || workingFolder.startsWith(`${projectFolder}/`);
            if (isInProject) {
                processIds.push(processId);
            }
        } catch {
            // The process ended while it was being read, or belongs to another user.
        }
    }

    return processIds;
}
