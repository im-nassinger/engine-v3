import { Container } from 'pixi.js';

// A render chunk holds at most twice this many children: inserting one more splits it in two.
// At 10,000 entities the World has about 1,000 children, so about 16 render chunks.
const CHUNK_SIZE = 64;

// Holds a node's children in draw order, split into render chunks: runs of consecutive children, each its
// own PixiJS render group. PixiJS uploads a render group's shapes again when one of them moves, so a drag
// uploads only the render chunks holding moved entities, not the whole level's vertices.
// A child removed with removeFromParent() or destroy() may leave a render chunk empty; it costs nothing to
// draw and is dropped on the next insert.
export class ChunkedChildren {
    readonly container = new Container();

    // The children in draw order, the first drawn first.
    get children(): Container[] {
        return this.chunks.flatMap((chunk) => chunk.children);
    }

    get count() {
        let count = 0;
        for (const chunk of this.chunks) {
            count += chunk.children.length;
        }

        return count;
    }

    get chunkCount() {
        return this.chunks.length;
    }

    // Draws the child in front of all the others.
    append(child: Container) {
        this.insertAt(this.count, child);
    }

    // Puts the child at this place in the draw order, 0 drawn first. Remove it from its parent first.
    insertAt(drawIndex: number, child: Container) {
        this.dropEmptyChunks();

        let remaining = drawIndex;
        for (const chunk of this.chunks) {
            if (remaining <= chunk.children.length) {
                chunk.addChildAt(child, remaining);
                this.splitIfFull(chunk);
                return;
            }

            remaining -= chunk.children.length;
        }

        const chunk = this.addChunk(this.chunks.length);
        chunk.addChild(child);
    }

    private get chunks() {
        return this.container.children;
    }

    private addChunk(index: number) {
        const chunk = new Container({ isRenderGroup: true });
        this.container.addChildAt(chunk, index);

        return chunk;
    }

    private splitIfFull(chunk: Container) {
        const isFull = chunk.children.length > 2 * CHUNK_SIZE;
        if (!isFull) return;

        const index = this.chunks.indexOf(chunk);
        const secondHalf = this.addChunk(index + 1);
        const moved = chunk.children.slice(CHUNK_SIZE);
        for (const child of moved) {
            secondHalf.addChild(child);
        }
    }

    private dropEmptyChunks() {
        const empty = this.chunks.filter((chunk) => chunk.children.length === 0);
        for (const chunk of empty) {
            chunk.destroy();
        }
    }
}
