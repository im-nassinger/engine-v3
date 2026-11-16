import type { PickedFile } from '../../../editor/saving/index.ts';

// A browser File as the editor's PickedFile: its bytes are read only when the import starts.
export function pickedFileOf(file: File): PickedFile {
    return { name: file.name, read: () => file.arrayBuffer() };
}
