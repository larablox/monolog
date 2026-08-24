import { MemoryProcessor } from "Monolog/Processor/MemoryProcessor";
import type { LogRecord } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\Processor\MemoryUsageProcessor`.
 *
 * `gcinfo()` (Roblox's replacement for the deprecated `collectgarbage("count")`)
 * reports kilobytes; multiplied by 1024 so `formatBytes()` sees the same unit
 * PHP's `memory_get_usage()` returns.
 */
export class MemoryUsageProcessor extends MemoryProcessor {
    public process(record: LogRecord): LogRecord {
        const usage = gcinfo() * 1024;

        record.extra.memory_usage = this.formatBytes(usage);

        return record;
    }
}
