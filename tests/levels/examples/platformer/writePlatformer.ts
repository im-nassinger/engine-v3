// Builds the example platformer and writes it as a project file the editor imports:
//   node tests/levels/examples/platformer/writePlatformer.ts
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { FflateZipCodec } from '../../../../src/adapters/zip/index.ts';
import { LevelWriter } from '../../../../src/core/level-data/index.ts';
import { ProjectFile } from '../../../../src/editor/saving/index.ts';

import { buildPlatformer } from './buildPlatformer.ts';

const ROOT = path.join(import.meta.dirname, '..', '..', '..', '..');
const OUTPUT_FOLDER = path.join(ROOT, 'examples');
const OUTPUT_FILE = path.join(OUTPUT_FOLDER, 'blob-platformer.editable');

const { level } = buildPlatformer();
const projectFile = new ProjectFile(new LevelWriter(), new FflateZipCodec());
const packed = await projectFile.pack(level);

await mkdir(OUTPUT_FOLDER, { recursive: true });
await writeFile(OUTPUT_FILE, packed);
console.log(`Wrote ${OUTPUT_FILE} (${packed.length} bytes).`);
