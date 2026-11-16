import type { LevelData, LevelLimits, LevelReader, LevelWriter, ReadOutcome } from '../../../core/level-data/index.ts';

import type { ZipReader } from '../contracts/ZipReader.ts';
import { LEVEL_JSON_PATH } from '../project-file/ProjectFile.ts';

export type ImportCheckOptions = {
    readonly zip: ZipReader;
    readonly reader: LevelReader;
    readonly writer: LevelWriter;
    readonly limits: LevelLimits;
};

type Refused = ReadOutcome<never>;

const NOT_A_LEVEL: Refused = { ok: false, refusal: { reason: 'notALevel' } };

function damaged(detail: string): Refused {
    return { ok: false, refusal: { reason: 'damaged', detail } };
}

function tooBig(limits: LevelLimits): Refused {
    return { ok: false, refusal: { reason: 'overLimit', limit: 'size', max: limits.maxBytes } };
}

// Checks a project file before anything changes, in the import worker: the zip's directory without
// unpacking, then the files unpacked with a running count, then level.json read by LevelReader like every
// level. Answers with the level written again as LevelData, the plain data that can cross to the page.
// A file that unpacks past the size limit is refused as over the 'size' limit.
export class ImportCheck {
    private readonly options: ImportCheckOptions;

    constructor(options: ImportCheckOptions) {
        this.options = options;
    }

    check(bytes: Uint8Array): ReadOutcome<LevelData> {
        const { zip, limits } = this.options;
        const directory = zip.readDirectory(bytes);
        if (directory === undefined) return NOT_A_LEVEL;

        const declaredBytes = directory.reduce((sum, entry) => sum + entry.declaredBytes, 0);
        if (declaredBytes > limits.maxBytes) return tooBig(limits);
        if (!directory.some((entry) => entry.path === LEVEL_JSON_PATH)) return NOT_A_LEVEL;

        const unpacked = zip.unpack(bytes, limits.maxBytes);
        if (!unpacked.ok) {
            return unpacked.reason === 'tooBig' ? tooBig(limits) : damaged('the zip could not be unpacked');
        }

        const levelJson = unpacked.entries.get(LEVEL_JSON_PATH);
        if (levelJson === undefined) return damaged(`${LEVEL_JSON_PATH} could not be unpacked`);

        return this.readLevel(levelJson);
    }

    private readLevel(levelJson: Uint8Array): ReadOutcome<LevelData> {
        const text = this.options.zip.decodeText(levelJson);
        if (text === undefined) return damaged(`${LEVEL_JSON_PATH} is not UTF-8`);

        let parsed: unknown;
        try {
            parsed = JSON.parse(text);
        } catch {
            return damaged(`${LEVEL_JSON_PATH} is not JSON`);
        }

        const outcome = this.options.reader.read(parsed);
        if (!outcome.ok) return outcome;

        return { ok: true, value: this.options.writer.write(outcome.value) };
    }
}
