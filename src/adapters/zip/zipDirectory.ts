import type { ZipDirectoryEntry } from '../../editor/saving/index.ts';

const END_SIGNATURE = 0x06054b50;
const ENTRY_SIGNATURE = 0x02014b50;
const END_LENGTH = 22;
const ENTRY_LENGTH = 46;
const LONGEST_COMMENT = 0xffff;
// A zip64 size: the real one is in an extra field. v1 never writes one, and a level fits in 32 bits, so it
// counts as more than any limit.
const ZIP64_SIZE = 0xffffffff;

const nameDecoder = new TextDecoder();

function findEnd(view: DataView) {
    const lowest = Math.max(0, view.byteLength - END_LENGTH - LONGEST_COMMENT);
    for (let at = view.byteLength - END_LENGTH; at >= lowest; at--) {
        if (view.getUint32(at, true) === END_SIGNATURE) return at;
    }

    return undefined;
}

// A zip's central directory, read without unpacking anything: each file's path and the size it declares
// unpacked. Undefined when the bytes aren't a zip or the directory doesn't fit inside them.
export function readZipDirectory(bytes: Uint8Array): readonly ZipDirectoryEntry[] | undefined {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const end = findEnd(view);
    if (end === undefined) return undefined;

    const count = view.getUint16(end + 10, true);
    const directoryLength = view.getUint32(end + 12, true);
    const directoryStart = view.getUint32(end + 16, true);
    if (directoryStart + directoryLength > end) return undefined;

    const entries: ZipDirectoryEntry[] = [];
    let at = directoryStart;
    for (let index = 0; index < count; index++) {
        if (at + ENTRY_LENGTH > end || view.getUint32(at, true) !== ENTRY_SIGNATURE) return undefined;

        const size = view.getUint32(at + 24, true);
        const nameLength = view.getUint16(at + 28, true);
        const extraLength = view.getUint16(at + 30, true);
        const commentLength = view.getUint16(at + 32, true);
        const nameStart = at + ENTRY_LENGTH;
        if (nameStart + nameLength > end) return undefined;

        const path = nameDecoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
        entries.push({ path, declaredBytes: size === ZIP64_SIZE ? Number.POSITIVE_INFINITY : size });
        at = nameStart + nameLength + extraLength + commentLength;
    }

    return entries;
}
