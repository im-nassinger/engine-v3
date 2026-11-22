const TICKS_PER_SECOND = 60;

// A run's time from its tick count, as the end window shows it: minutes, then seconds and hundredths,
// such as 0:42.18. Hundredths are cut, not rounded, so the time never reads later than the tick.
export function runTimeText(ticks: number) {
    const hundredthsInAll = Math.floor((ticks * 100) / TICKS_PER_SECOND);
    const minutes = Math.floor(hundredthsInAll / 6_000);
    const seconds = Math.floor((hundredthsInAll % 6_000) / 100);
    const hundredths = hundredthsInAll % 100;

    const secondsText = String(seconds).padStart(2, '0');
    const hundredthsText = String(hundredths).padStart(2, '0');

    return `${minutes}:${secondsText}.${hundredthsText}`;
}
