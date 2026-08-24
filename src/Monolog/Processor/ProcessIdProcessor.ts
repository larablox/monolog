import type { LogRecord } from "Monolog/LogRecord";
import type { ProcessorInterface } from "Monolog/Processor/ProcessorInterface";

/**
 * PHP: `Monolog\Processor\ProcessIdProcessor`.
 *
 * There is no OS process id on Roblox. `game.JobId` is the closest identifier
 * for "which running process is this" -- a string, not the int
 * `getmypid()` returns, and empty outside a real server (e.g. Studio Play
 * testing), where it falls back to `"studio"`.
 */
export class ProcessIdProcessor implements ProcessorInterface {
    public process(record: LogRecord): LogRecord {
        record.extra.process_id = game.JobId !== "" ? game.JobId : "studio";

        return record;
    }
}
