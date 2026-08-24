import type { LogRecord } from "Monolog/LogRecord";
import type { ProcessorInterface } from "Monolog/Processor/ProcessorInterface";

/** PHP: `Monolog\Processor\TagProcessor`. */
export class TagProcessor implements ProcessorInterface {
    private tags: Array<string> = [];

    public constructor(tags: Array<string> = []) {
        this.setTags(tags);
    }

    /** Adds to the existing tag list. */
    public addTags(tags: Array<string> = []): this {
        for (const tag of tags) {
            this.tags.push(tag);
        }

        return this;
    }

    /** Replaces the tag list. */
    public setTags(tags: Array<string> = []): this {
        this.tags = tags;

        return this;
    }

    public process(record: LogRecord): LogRecord {
        record.extra.tags = this.tags;

        return record;
    }
}
