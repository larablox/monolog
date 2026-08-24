import type { LogRecord } from "Monolog/LogRecord";
import type { ProcessorInterface } from "Monolog/Processor/ProcessorInterface";

/**
 * PHP: `Monolog\Processor\MemoryProcessor`.
 *
 * `realUsage` has no real platform distinction here: `gcinfo()` (Roblox's
 * replacement for the deprecated `collectgarbage("count")`) is the only
 * memory reading source Luau exposes, and there is no PHP
 * `emalloc()`-vs-OS-allocated split to choose between. The constructor
 * parameter is kept for API-shape parity but does not change behavior in
 * either subclass -- said once here rather than repeated in each.
 */
export abstract class MemoryProcessor implements ProcessorInterface {
    public constructor(
        protected realUsage = true,
        protected useFormatting = true,
    ) {}

    public abstract process(record: LogRecord): LogRecord;

    /** Formats bytes into a human-readable string if `useFormatting` is true, otherwise returns `bytes` as-is. */
    protected formatBytes(bytes: number): string | number {
        if (!this.useFormatting) {
            return bytes;
        }

        if (bytes > 1024 * 1024) {
            return `${math.round((bytes / 1024 / 1024) * 100) / 100} MB`;
        } else if (bytes > 1024) {
            return `${math.round((bytes / 1024) * 100) / 100} KB`;
        }

        return `${bytes} B`;
    }
}
