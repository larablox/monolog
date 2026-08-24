import type { LogRecord } from "Monolog/LogRecord";
import type { ProcessorInterface } from "Monolog/Processor/ProcessorInterface";
import type { ResettableInterface } from "Monolog/ResettableInterface";

const HttpService = game.GetService("HttpService");

function generateUid(length: number): string {
    const [guid] = HttpService.GenerateGUID(false).gsub("-", "");

    return guid.lower().sub(1, length);
}

/**
 * PHP: `Monolog\Processor\UidProcessor`.
 *
 * `bin2hex(random_bytes())` has no equivalent here; the uid instead comes from
 * `HttpService:GenerateGUID(false)`, with dashes stripped, lowercased, and cut
 * to `length` characters.
 */
export class UidProcessor implements ProcessorInterface, ResettableInterface {
    private uid: string;

    public constructor(private readonly length = 7) {
        if (length > 32 || length < 1) {
            error("The uid length must be an integer between 1 and 32");
        }

        this.uid = generateUid(length);
    }

    public process(record: LogRecord): LogRecord {
        record.extra.uid = this.uid;

        return record;
    }

    public getUid(): string {
        return this.uid;
    }

    public reset(): void {
        this.uid = generateUid(this.uid.size());
    }
}
