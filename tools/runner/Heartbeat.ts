const CHECK_INTERVAL_MS = 30 * 1000;
// The owner's rule is at most 10 minutes without a message. Sending at 9 leaves room for a
// check delayed by a blocking command, and for a failed send to be tried again.
const QUIET_LIMIT_MS = 9 * 60 * 1000;

type Messenger = {
    readonly lastSentAtMs: number;
    send(message: string): Promise<void>;
};

// Sends an update whenever the messenger has been quiet for too long.
export class Heartbeat {
    private readonly messenger: Messenger;
    private readonly describeActivity: () => string;
    private isSending = false;

    constructor(messenger: Messenger, describeActivity: () => string) {
        this.messenger = messenger;
        this.describeActivity = describeActivity;
    }

    start() {
        const timer = setInterval(() => {
            void this.sendIfQuiet();
        }, CHECK_INTERVAL_MS);

        // The updates must not keep a finished runner alive.
        timer.unref();
    }

    private async sendIfQuiet() {
        const quietMs = Date.now() - this.messenger.lastSentAtMs;
        if (this.isSending || quietMs < QUIET_LIMIT_MS) return;

        this.isSending = true;
        const message = this.describeActivity();
        await this.messenger.send(message);
        this.isSending = false;
    }
}
