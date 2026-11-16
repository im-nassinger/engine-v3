import type { Unsubscribe } from '../../../core/events/index.ts';
import type { FileDropEvents } from '../../../editor/commands/index.ts';

import { pickedFileOf } from './pickedFileOf.ts';

type DropHandler = Pick<FileDropEvents, 'dropFile'>;

const FILES_TYPE = 'Files';

// Files dragged over the page: the browser would open a dropped file in place of the editor, so a drag
// carrying files is answered as a copy and its drop goes to Import instead. Only the first file is used,
// since one level is open at a time. Drags of anything else, like text, stay the browser's.
export class FileDropTarget {
    private readonly handler: DropHandler;
    private readonly page: Window;

    constructor(handler: DropHandler, page: Window) {
        this.handler = handler;
        this.page = page;
    }

    connect(): Unsubscribe {
        const handleDragOver = (event: DragEvent) => this.handleDragOver(event);
        const handleDrop = (event: DragEvent) => this.handleDrop(event);

        this.page.addEventListener('dragover', handleDragOver);
        this.page.addEventListener('drop', handleDrop);

        return () => {
            this.page.removeEventListener('dragover', handleDragOver);
            this.page.removeEventListener('drop', handleDrop);
        };
    }

    private handleDragOver(event: DragEvent) {
        const transfer = event.dataTransfer;
        if (transfer === null) return;
        if (!carriesFiles(transfer)) return;

        event.preventDefault();
        transfer.dropEffect = 'copy';
    }

    private handleDrop(event: DragEvent) {
        const transfer = event.dataTransfer;
        if (transfer === null) return;
        if (!carriesFiles(transfer)) return;

        event.preventDefault();
        const file = transfer.files[0];
        if (file === undefined) return;

        const picked = pickedFileOf(file);
        this.handler.dropFile(picked);
    }
}

function carriesFiles(transfer: DataTransfer) {
    return transfer.types.includes(FILES_TYPE);
}
