import { NormalizerFormatter } from "Monolog/Formatter/NormalizerFormatter";
import { markAsJsonObject } from "Monolog/Utils";
import type { LogRecord, RecordBag } from "Monolog/LogRecord";

function isEmptyBag(bag: RecordBag): boolean {
    const [key] = next(bag);

    return key === undefined;
}

/**
 * PHP: `Monolog\Formatter\JsonFormatter`.
 *
 * Upstream marks an empty `context`/`extra` with `new \stdClass` so it
 * encodes as `{}` rather than `[]`; there is no `\stdClass` here, so
 * `markAsJsonObject()` marks the (still-empty) `RecordBag` instead -- see
 * that function's comment in `Utils.ts`.
 */
export class JsonFormatter extends NormalizerFormatter {
    public static readonly BATCH_MODE_JSON = 1;
    public static readonly BATCH_MODE_NEWLINES = 2;

    private includeStacktracesFlag: boolean;

    public constructor(
        protected batchMode = JsonFormatter.BATCH_MODE_JSON,
        protected appendNewline = true,
        protected ignoreEmptyContextAndExtra = false,
        includeStacktraces = false,
    ) {
        super();
        this.includeStacktracesFlag = includeStacktraces;
    }

    /** The batch mode option configures the formatting style for multiple records. */
    public getBatchMode(): number {
        return this.batchMode;
    }

    /** True if newlines are appended to every formatted record. */
    public isAppendingNewlines(): boolean {
        return this.appendNewline;
    }

    /** Formats a log record. */
    public format(record: LogRecord): string {
        const normalized = this.normalizeRecord(record);

        return this.toJson(normalized) + (this.appendNewline ? "\n" : "");
    }

    /** Formats a set of log records. */
    public formatBatch(records: Array<LogRecord>): string {
        return this.batchMode === JsonFormatter.BATCH_MODE_NEWLINES
            ? this.formatBatchNewlines(records)
            : this.formatBatchJson(records);
    }

    /** Kept for signature parity; there is no PHP trace string here -- see `LineFormatter`'s class comment. */
    public includeStacktraces(include = true): this {
        this.includeStacktracesFlag = include;

        return this;
    }

    protected normalizeRecord(record: LogRecord): RecordBag {
        const normalized = super.normalizeRecord(record);

        if (isEmptyBag(normalized.context as RecordBag)) {
            if (this.ignoreEmptyContextAndExtra) {
                delete normalized.context;
            } else {
                normalized.context = markAsJsonObject({});
            }
        }

        if (isEmptyBag(normalized.extra as RecordBag)) {
            if (this.ignoreEmptyContextAndExtra) {
                delete normalized.extra;
            } else {
                normalized.extra = markAsJsonObject({});
            }
        }

        return normalized;
    }

    /** Returns a JSON-encoded array of records. */
    protected formatBatchJson(records: Array<LogRecord>): string {
        const normalized = new Array<RecordBag>();

        for (const record of records) {
            normalized.push(this.normalizeRecord(record));
        }

        return this.toJson(normalized);
    }

    /** Uses new lines to separate records instead of a JSON-encoded array. */
    protected formatBatchNewlines(records: Array<LogRecord>): string {
        const oldAppendNewline = this.appendNewline;
        this.appendNewline = false;

        const lines = new Array<string>();

        for (const record of records) {
            lines.push(this.format(record));
        }

        this.appendNewline = oldAppendNewline;

        return lines.join("\n");
    }
}
