const MINUTE_MS = 60 * 1000;
const DETAIL_LENGTH_LIMIT = 300;

// What the runner is doing right now, for the updates it sends while nothing else happens.
export class RunnerActivity {
    private text = 'Starting';
    private detail = '';
    private startedAtMs = Date.now();

    start(text: string) {
        this.text = text;
        this.detail = '';
        this.startedAtMs = Date.now();
    }

    setDetail(detail: string) {
        const trimmedDetail = detail.trim();
        const [firstLine = ''] = trimmedDetail.split('\n');
        this.detail = firstLine.slice(0, DETAIL_LENGTH_LIMIT);
    }

    describe() {
        const elapsedMs = Date.now() - this.startedAtMs;
        const elapsedMinutes = Math.floor(elapsedMs / MINUTE_MS);
        const summary = `⏳ **${elapsedMinutes} min** · ${this.text}`;
        if (this.detail === '') return summary;

        return `${summary}\n${this.detail}`;
    }
}
