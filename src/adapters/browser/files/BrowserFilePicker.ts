import { PROJECT_FILE_EXTENSION } from '../../../editor/saving/index.ts';
import type { FilePicker, PickedFile } from '../../../editor/saving/index.ts';

import { pickedFileOf } from './pickedFileOf.ts';

// The browser's own file dialog, through a hidden file input clicked inside the user's click. It offers
// project files first, but any file can be chosen: only what is inside decides. A browser without the
// input's cancel event never answers a cancel, which leaves nothing waiting but this promise.
export class BrowserFilePicker implements FilePicker {
    private readonly page: Window;

    constructor(page: Window) {
        this.page = page;
    }

    pickFile() {
        const input = this.page.document.createElement('input');
        input.type = 'file';
        input.accept = PROJECT_FILE_EXTENSION;
        input.style.display = 'none';
        this.page.document.body.append(input);

        return new Promise<PickedFile | undefined>((resolve) => {
            const finish = (picked: PickedFile | undefined) => {
                input.remove();
                resolve(picked);
            };
            const handleChange = () => {
                const file = input.files?.[0];
                if (file === undefined) {
                    finish(undefined);
                    return;
                }

                finish(pickedFileOf(file));
            };

            input.addEventListener('change', handleChange, { once: true });
            input.addEventListener('cancel', () => finish(undefined), { once: true });
            input.click();
        });
    }
}
