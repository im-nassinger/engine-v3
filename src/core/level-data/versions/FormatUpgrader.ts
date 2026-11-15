// Turns one format version's level.json into the next one's. Works on the raw JSON, before the reader
// checks anything, so it must not trust what it is given.
export type FormatUpgradeStep = (fileData: unknown) => unknown;

// Step i turns version i + 1 into version i + 2, so the latest version is one more than the step count.
// Versions are never rolled back: a step is only ever added at the end.
export class FormatUpgrader {
    private readonly steps: readonly FormatUpgradeStep[];

    constructor(steps: readonly FormatUpgradeStep[]) {
        this.steps = [...steps];
    }

    // v1 has no steps.
    static createV1() {
        return new FormatUpgrader([]);
    }

    get latestVersion() {
        return this.steps.length + 1;
    }

    // The caller refuses a version below 1 or above the latest before asking.
    upgrade(fileData: unknown, fileVersion: number) {
        const isKnownVersion = Number.isInteger(fileVersion) && fileVersion >= 1 && fileVersion <= this.latestVersion;
        if (!isKnownVersion) {
            throw new Error(`Format version ${fileVersion} can't be upgraded.`);
        }

        let upgraded = fileData;
        for (const step of this.steps.slice(fileVersion - 1)) {
            upgraded = step(upgraded);
        }

        return upgraded;
    }
}
