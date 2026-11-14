const DISCORD_MESSAGE_LIMIT = 2000;

export class DiscordNotifier {
    private readonly webhookUrl: string;

    constructor(webhookUrl: string) {
        this.webhookUrl = webhookUrl;
    }

    async send(message: string) {
        const content = message.slice(0, DISCORD_MESSAGE_LIMIT);
        const body = JSON.stringify({ username: 'engine-v3 runner', content });

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            });

            if (!response.ok) {
                console.error(`Discord answered ${response.status}: ${await response.text()}`);
            }
        } catch (error) {
            // A message that can't be sent must never stop the runner.
            console.error('Discord message failed:', error);
        }
    }
}
