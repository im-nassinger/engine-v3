import fs from 'node:fs';

// A file holding one process ID, so a process can tell whether another one is still running.
// The command check guards against the ID being reused by an unrelated process after a reboot.
export class PidFile {
    private readonly filePath: string;
    private readonly commandMarker: string;

    constructor(filePath: string, commandMarker: string) {
        this.filePath = filePath;
        this.commandMarker = commandMarker;
    }

    // The ID in the file, if that process is still alive and its command contains the marker.
    readLiveProcessId() {
        const processId = this.readProcessId();
        if (processId === undefined) return undefined;
        if (!this.isMatchingProcessAlive(processId)) return undefined;

        return processId;
    }

    // Writes the ID only if the file doesn't exist yet. Returns false if another process won the race.
    writeIfAbsent(processId: number) {
        try {
            fs.writeFileSync(this.filePath, `${processId}\n`, { flag: 'wx' });
            return true;
        } catch (error) {
            if (isFileExistsError(error)) return false;
            throw error;
        }
    }

    remove() {
        fs.rmSync(this.filePath, { force: true });
    }

    private readProcessId() {
        const fileText = readTextOrUndefined(this.filePath);
        if (fileText === undefined) return undefined;

        const processId = Number.parseInt(fileText, 10);
        if (Number.isNaN(processId)) return undefined;

        return processId;
    }

    private isMatchingProcessAlive(processId: number) {
        const commandLine = readTextOrUndefined(`/proc/${processId}/cmdline`);
        if (commandLine === undefined) return false;

        const readableCommand = commandLine.replaceAll('\0', ' ');
        return readableCommand.includes(this.commandMarker);
    }
}

function readTextOrUndefined(filePath: string) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch {
        return undefined;
    }
}

function isFileExistsError(error: unknown) {
    return error instanceof Error && 'code' in error && error.code === 'EEXIST';
}
