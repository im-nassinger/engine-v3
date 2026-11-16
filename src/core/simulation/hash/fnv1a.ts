const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

// FNV-1a over the bytes of the numbers, as 8 hex digits. The bytes are in the computer's own order, which
// is little-endian in every browser and CI runner.
export function fnv1a(numbers: Float64Array) {
    const bytes = new Uint8Array(numbers.buffer, numbers.byteOffset, numbers.byteLength);
    let hash = FNV_OFFSET_BASIS;

    for (const byte of bytes) {
        hash ^= byte;
        hash = Math.imul(hash, FNV_PRIME) >>> 0;
    }

    return hash.toString(16).padStart(8, '0');
}
