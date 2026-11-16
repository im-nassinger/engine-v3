import { strToU8, zip } from 'fflate';
import type { AsyncZippable } from 'fflate';

import type { ZipCodec, ZipEntry } from '../../editor/saving/index.ts';

// The project file's zip with fflate. Packing runs off the page's thread, in fflate's own workers, so a big
// level doesn't freeze the editor while it exports.
export class FflateZipCodec implements ZipCodec {
    pack(entries: readonly ZipEntry[]): Promise<Uint8Array> {
        const files: AsyncZippable = {};
        for (const entry of entries) {
            files[entry.path] = typeof entry.data === 'string' ? strToU8(entry.data) : entry.data;
        }

        return new Promise((resolve, reject) => {
            zip(files, (error, packed) => {
                if (error !== null) {
                    reject(error);
                    return;
                }

                resolve(packed);
            });
        });
    }
}
