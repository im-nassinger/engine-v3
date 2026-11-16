import { Container } from 'pixi.js';
import { describe, expect, test } from 'vitest';
import { ChunkedChildren } from './ChunkedChildren.ts';

function makeChildren(count: number) {
    const children: Container[] = [];
    for (let index = 0; index < count; index += 1) {
        children.push(new Container());
    }

    return children;
}

describe('ChunkedChildren', () => {
    test('splits many children into render chunks and keeps their draw order', () => {
        const chunked = new ChunkedChildren();
        const children = makeChildren(1000);

        for (const child of children) {
            chunked.append(child);
        }

        expect(chunked.children).toEqual(children);
        expect(chunked.count).toBe(1000);
        expect(chunked.chunkCount).toBeGreaterThan(5);
        for (const chunk of chunked.container.children) {
            expect(chunk.isRenderGroup).toBe(true);
        }
    });

    test('inserts at a place in the draw order, across render chunks', () => {
        const chunked = new ChunkedChildren();
        const children = makeChildren(300);
        for (const child of children) {
            chunked.append(child);
        }
        const inserted = new Container();

        chunked.insertAt(150, inserted);
        children.splice(150, 0, inserted);

        expect(chunked.children).toEqual(children);
    });

    test('drops an emptied render chunk on the next insert', () => {
        const chunked = new ChunkedChildren();
        const children = makeChildren(200);
        for (const child of children) {
            chunked.append(child);
        }
        const chunksBefore = chunked.chunkCount;
        const firstChunk = chunked.container.children[0];
        const inFirstChunk = [...(firstChunk?.children ?? [])];

        for (const child of inFirstChunk) {
            child.removeFromParent();
        }
        chunked.append(new Container());

        expect(chunked.chunkCount).toBe(chunksBefore - 1);
        expect(chunked.count).toBe(200 - inFirstChunk.length + 1);
    });
});
