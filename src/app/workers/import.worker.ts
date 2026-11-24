import { FflateZipReader } from '../../adapters/zip/index.ts';
import { ImportWorkerHost } from '../../adapters/worker/index.ts';
import { createV1Registry } from '../../core/components/index.ts';
import { FormatUpgrader, LevelReader, LevelWriter, V1_LEVEL_LIMITS } from '../../core/level-data/index.ts';
import { ImportCheck } from '../../editor/saving/index.ts';

// The import worker's composition root: ImportCheck with fflate and v1's reader and limits, answering the page.
const reader = new LevelReader(createV1Registry(), V1_LEVEL_LIMITS, FormatUpgrader.createCurrent());
const check = new ImportCheck({
    zip: new FflateZipReader(),
    reader,
    writer: new LevelWriter(),
    limits: V1_LEVEL_LIMITS,
});

new ImportWorkerHost(self, check).listen();
