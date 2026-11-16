import type { StoragePersistence } from '../contracts/StoragePersistence.ts';

// A StoragePersistence for tests: counts the asks and answers with agrees.
export class FakePersistence implements StoragePersistence {
    askCount = 0;
    agrees: boolean;

    constructor(agrees = true) {
        this.agrees = agrees;
    }

    persist() {
        this.askCount += 1;

        return Promise.resolve(this.agrees);
    }
}
