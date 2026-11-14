// The parent of each node and the ordered children of each node, index 0 being the top row.
// Generic over the node, so it never imports Entity, which reads its parent and children from here.
export class LevelTree<Node> {
    private readonly parentsByNode = new Map<Node, Node>();
    private readonly childrenByNode = new Map<Node, Node[]>();

    addRoot(root: Node) {
        this.childrenByNode.set(root, []);
    }

    contains(node: Node) {
        return this.childrenByNode.has(node);
    }

    parentOf(node: Node) {
        return this.parentsByNode.get(node);
    }

    childrenOf(node: Node): readonly Node[] {
        return this.requireChildren(node);
    }

    // The number of parents above the node: 0 for the root.
    depthOf(node: Node) {
        let depth = 0;
        let parent = this.parentsByNode.get(node);

        while (parent !== undefined) {
            depth += 1;
            parent = this.parentsByNode.get(parent);
        }

        return depth;
    }

    // How many levels the subtree goes below the node: 0 for a node without children.
    heightBelow(node: Node): number {
        let height = 0;

        for (const child of this.requireChildren(node)) {
            const childHeight = this.heightBelow(child) + 1;
            if (childHeight > height) {
                height = childHeight;
            }
        }

        return height;
    }

    isAncestorOf(ancestor: Node, node: Node) {
        let parent = this.parentsByNode.get(node);

        while (parent !== undefined) {
            if (parent === ancestor) return true;
            parent = this.parentsByNode.get(parent);
        }

        return false;
    }

    insert(node: Node, parent: Node, index: number) {
        const siblings = this.requireChildren(parent);
        this.requireIndex(index, siblings.length);

        siblings.splice(index, 0, node);
        this.parentsByNode.set(node, parent);
        this.childrenByNode.set(node, []);
    }

    // Index is the node's position among its new siblings once it has moved.
    move(node: Node, newParent: Node, index: number) {
        const children = this.requireChildren(node);

        this.detach(node);

        const siblings = this.requireChildren(newParent);
        this.requireIndex(index, siblings.length);

        siblings.splice(index, 0, node);
        this.parentsByNode.set(node, newParent);
        this.childrenByNode.set(node, children);
    }

    // Removes one node that has no children left.
    removeLeaf(node: Node) {
        const children = this.requireChildren(node);
        if (children.length > 0) {
            throw new Error('Only a node without children can be removed.');
        }

        this.detach(node);
        this.childrenByNode.delete(node);
    }

    // Parents before their children, top row first.
    *preOrder(root: Node): Generator<Node> {
        yield root;

        for (const child of this.requireChildren(root)) {
            yield* this.preOrder(child);
        }
    }

    // Children before their parents, so each node is visited while its parent still exists.
    *postOrder(root: Node): Generator<Node> {
        const childrenAtStart = [...this.requireChildren(root)];

        for (const child of childrenAtStart) {
            yield* this.postOrder(child);
        }

        yield root;
    }

    private detach(node: Node) {
        const parent = this.parentsByNode.get(node);
        if (parent === undefined) {
            throw new Error('The root never leaves the tree.');
        }

        const siblings = this.requireChildren(parent);
        const position = siblings.indexOf(node);
        siblings.splice(position, 1);
        this.parentsByNode.delete(node);
    }

    private requireChildren(node: Node) {
        const children = this.childrenByNode.get(node);
        if (children === undefined) {
            throw new Error('The node is not in the tree.');
        }

        return children;
    }

    private requireIndex(index: number, siblingCount: number) {
        const isWholeNumber = Number.isInteger(index);
        const isInRange = index >= 0 && index <= siblingCount;
        if (isWholeNumber && isInRange) return;

        throw new Error(`Index ${index} is outside 0 to ${siblingCount}.`);
    }
}
