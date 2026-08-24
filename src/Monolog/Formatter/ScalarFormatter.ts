import { NormalizerFormatter } from "Monolog/Formatter/NormalizerFormatter";
import type { LogRecord, RecordBag } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\Formatter\ScalarFormatter`.
 *
 * Formats data into a map of scalar (or `undefined`) values; anything
 * non-scalar is JSON-encoded instead. Upstream's `format()` returns that map
 * directly; this port's `FormatterInterface.format()` is narrowed to `string`
 * (see `NormalizerFormatter`'s class comment), so `format()` here JSON-encodes
 * it, and the map itself is exposed as `toScalarRecord()` for callers that
 * want the structured form.
 */
export class ScalarFormatter extends NormalizerFormatter {
    /** Formats a log record. */
    public format(record: LogRecord): string {
        return this.toJson(this.toScalarRecord(record));
    }

    /** PHP: `ScalarFormatter::format()`'s actual return value. */
    public toScalarRecord(record: LogRecord): RecordBag {
        const result: RecordBag = {};

        for (const [key, value] of pairs(record.toArray())) {
            result[key as string] = this.toScalar(value);
        }

        return result;
    }

    protected toScalar(value: unknown): unknown {
        const normalized = this.normalize(value);

        if (typeIs(normalized, "table")) {
            return this.toJson(normalized);
        }

        return normalized;
    }
}
