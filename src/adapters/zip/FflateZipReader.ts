import { Unzip, UnzipInflate } from 'fflate';
import type { UnzipFile } from 'fflate';

import type { Unpacked, ZipReader } from '../../editor/saving/index.ts';

import { readZipDirectory } from './zipDirectory.ts';

// Deflate unpacks at most about 1,032 times its size, so a piece this big gives at most about 17 MB at once,
// and the running count stops a zip bomb soon after it passes the limit.
const PIECE_BYTES = 16 * 1024;

const strictDecoder = new TextDecoder('utf-8', { fatal: true });

type Unpacking = {
    readonly maxBytes: number;
    readonly entries: Map<string, Uint8Array>;
    count: number;
    tooBig: boolean;
    failed: boolean;
};

function joinPieces(pieces: readonly Uint8Array[]) {
    const length = pieces.reduce((sum, piece) => sum + piece.length, 0);
    const joined = new Uint8Array(length);
    let at = 0;
    for (const piece of pieces) {
        joined.set(piece, at);
        at += piece.length;
    }

    return joined;
}

function receiveFile(file: UnzipFile, unpacking: Unpacking) {
    const pieces: Uint8Array[] = [];
    file.ondata = (error, data, final) => {
        if (error !== null) {
            unpacking.failed = true;
            return;
        }

        unpacking.count += data.length;
        if (unpacking.count > unpacking.maxBytes) {
            unpacking.tooBig = true;
            file.terminate();
            return;
        }

        pieces.push(data);
        if (final) {
            unpacking.entries.set(file.name, joinPieces(pieces));
        }
    };
    file.start();
}

// Reads a project file with fflate's streaming Unzip, fed in small pieces, so the running count is checked
// after every piece and a file that unpacks past the limit stops without ever being whole. It runs in the
// import worker, where blocking is no harm.
export class FflateZipReader implements ZipReader {
    readDirectory(bytes: Uint8Array) {
        return readZipDirectory(bytes);
    }

    unpack(bytes: Uint8Array, maxBytes: number): Unpacked {
        const unpacking: Unpacking = { maxBytes, entries: new Map(), count: 0, tooBig: false, failed: false };
        const unzip = new Unzip((file) => receiveFile(file, unpacking));
        unzip.register(UnzipInflate);

        try {
            for (let at = 0; at < bytes.length; at += PIECE_BYTES) {
                unzip.push(bytes.subarray(at, at + PIECE_BYTES), at + PIECE_BYTES >= bytes.length);
                if (unpacking.tooBig) return { ok: false, reason: 'tooBig' };
                if (unpacking.failed) return { ok: false, reason: 'damaged' };
            }
        } catch {
            // fflate throws on a compression it doesn't know or a header it can't read.
            return { ok: false, reason: 'damaged' };
        }

        return { ok: true, entries: unpacking.entries };
    }

    decodeText(bytes: Uint8Array) {
        try {
            return strictDecoder.decode(bytes);
        } catch {
            return undefined;
        }
    }
}
