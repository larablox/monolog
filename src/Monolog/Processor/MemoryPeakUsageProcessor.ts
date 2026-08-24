import { MemoryProcessor } from "Monolog/Processor/MemoryProcessor";
import type { LogRecord } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\Processor\MemoryPeakUsageProcessor`.
 *
 * There is no `memory_get_peak_usage()` equivalent -- Luau only reports
 * *current* GC memory, not a running peak, so this tracks one itself: a
 * private field updated to the highest reading seen so far on every call,
 * seeded at construction. "Peak" here means the highest reading this
 * processor instance has observed since it was created, not an OS-level
 * peak -- a real, necessary behavioral divergence, not a cosmetic one.
 */
export class MemoryPeakUsageProcessor extends MemoryProcessor {
    private peakBytes: number;

    public constructor(realUsage = true, useFormatting = true) {
        super(realUsage, useFormatting);
        this.peakBytes = gcinfo() * 1024;
    }

    public process(record: LogRecord): LogRecord {
        const currentBytes = gcinfo() * 1024;
        this.peakBytes = math.max(this.peakBytes, currentBytes);

        record.extra.memory_peak_usage = this.formatBytes(this.peakBytes);

        return record;
    }
}
