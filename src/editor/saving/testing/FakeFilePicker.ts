import type { FilePicker, PickedFile } from '../contracts/FilePicker.ts';

// A FilePicker for tests: gives the file set, or undefined as if the user cancelled, and counts the picks.
export class FakeFilePicker implements FilePicker {
    file: PickedFile | undefined = pickedFile('castle.editable');
    pickedCount = 0;

    pickFile() {
        this.pickedCount += 1;

        return Promise.resolve(this.file);
    }
}

// A picked file whose bytes are empty: the fake importer never looks at them.
export function pickedFile(name: string): PickedFile {
    return { name, read: () => Promise.resolve(new ArrayBuffer(0)) };
}
