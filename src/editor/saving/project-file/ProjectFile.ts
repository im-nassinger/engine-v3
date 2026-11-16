import type { Level } from '../../../core/level/index.ts';
import type { LevelWriter } from '../../../core/level-data/index.ts';
import type { ZipCodec } from '../contracts/ZipCodec.ts';

export const LEVEL_JSON_PATH = 'level.json';
export const PROJECT_FILE_EXTENSION = '.editable';
export const PROJECT_FILE_MEDIA_TYPE = 'application/zip';

// The project file: a zip holding level.json, the same text Autosave keeps in the browser. The level's
// files join it in v2, under files/.
export class ProjectFile {
    private readonly writer: LevelWriter;
    private readonly zip: ZipCodec;

    constructor(writer: LevelWriter, zip: ZipCodec) {
        this.writer = writer;
        this.zip = zip;
    }

    pack(level: Level): Promise<Uint8Array> {
        const levelJson = JSON.stringify(this.writer.write(level));

        return this.zip.pack([{ path: LEVEL_JSON_PATH, data: levelJson }]);
    }
}
