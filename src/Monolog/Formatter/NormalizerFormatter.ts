import { Utils } from "Monolog/Utils";
import type { FormatterInterface } from "Monolog/Formatter/FormatterInterface";
import type { LogRecord, RecordBag } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\Formatter\NormalizerFormatter`.
 *
 * Normalizes a record's context/extra into plain scalars/tables so it can be
 * dumped to a string. Upstream's `normalize()` recognizes PHP object kinds one
 * by one (`Throwable`, `JsonSerializable`, `__PHP_Incomplete_Class`,
 * `is_resource`) -- none of that exists here, so anything that is not a scalar
 * or a plain data table (a Luau table with no metatable) collapses to
 * `tostring()`, the same way an unrecognized PHP object type would. There is
 * no established "this is how an exception looks in a record" convention
 * anywhere in this codebase (checked -- nothing under `src/Monolog` treats
 * `context.exception` specially), so `normalizeException()`'s field-by-field
 * shape (`class`/`message`/`code`/`file`/`trace`/`previous`) is not ported:
 * there is no structured exception object to pull those fields from.
 *
 * `format()` is narrowed to return `string` here (this port's
 * `FormatterInterface`, unlike upstream's `mixed`-returning one, already
 * commits to that) rather than the raw normalized record upstream returns; it
 * JSON-encodes `normalizeRecord()`'s result instead. Subclasses that need the
 * raw record (`LineFormatter`, `JsonFormatter`, `ScalarFormatter`) call the
 * protected `normalizeRecord()` directly, exactly as upstream's `JsonFormatter`
 * already does rather than going through `parent::format()`.
 */
export class NormalizerFormatter implements FormatterInterface {
    public static readonly SIMPLE_DATE: string = "%Y-%m-%dT%H:%M:%S%z";

    protected dateFormat: string;
    protected maxNormalizeDepth = 9;
    protected maxNormalizeItemCount = 1000;

    /** Toggled by `setJsonPrettyPrint()`; the only `jsonEncodeOptions` bit this port's encoder understands. */
    private prettyPrint = false;

    /**
     * PHP: `NormalizerFormatter::$basePath`. Kept for API-shape parity: there
     * is no PHP exception/stack-trace file path to shorten with it here, so
     * it is stored and otherwise unused.
     */
    protected basePath = "";

    public constructor(dateFormat?: string) {
        this.dateFormat = dateFormat ?? NormalizerFormatter.SIMPLE_DATE;
    }

    /** Formats a log record. */
    public format(record: LogRecord): string {
        return this.toJson(this.normalizeRecord(record));
    }

    /** Normalize an arbitrary value to a scalar/table/undefined. */
    public normalizeValue(data: unknown): unknown {
        return this.normalize(data);
    }

    /**
     * Formats a set of log records. Upstream returns an array of normalized
     * records (`mixed`, per its `FormatterInterface`); this JSON-encodes that
     * same array once, for the same `string`-return reason `format()` does.
     */
    public formatBatch(records: Array<LogRecord>): string {
        const normalized = new Array<RecordBag>();

        for (const record of records) {
            normalized.push(this.normalizeRecord(record));
        }

        return this.toJson(normalized);
    }

    public getDateFormat(): string {
        return this.dateFormat;
    }

    public setDateFormat(dateFormat: string): this {
        this.dateFormat = dateFormat;

        return this;
    }

    /** The maximum number of normalization levels to go through. */
    public getMaxNormalizeDepth(): number {
        return this.maxNormalizeDepth;
    }

    public setMaxNormalizeDepth(maxNormalizeDepth: number): this {
        this.maxNormalizeDepth = maxNormalizeDepth;

        return this;
    }

    /** The maximum number of items to normalize per level. */
    public getMaxNormalizeItemCount(): number {
        return this.maxNormalizeItemCount;
    }

    public setMaxNormalizeItemCount(maxNormalizeItemCount: number): this {
        this.maxNormalizeItemCount = maxNormalizeItemCount;

        return this;
    }

    /** Enables pretty-printed JSON output. */
    public setJsonPrettyPrint(enable: boolean): this {
        this.prettyPrint = enable;

        return this;
    }

    /**
     * Setting a base path would hide it from exception/stack-trace file names
     * to shorten them upstream; there is nothing here that produces either, so
     * this only stores the value.
     */
    public setBasePath(path = ""): this {
        this.basePath = path;

        return this;
    }

    /**
     * Provided as an extension point, as upstream: `normalize()` is called
     * with sub-values of context data etc., so `normalizeRecord()` can be
     * overridden when data needs to be appended to the record but not to other
     * normalized data (see `JsonFormatter`).
     */
    protected normalizeRecord(record: LogRecord): RecordBag {
        const normalized = this.normalize(record.toArray()) as RecordBag;

        // `datetime` is a plain Unix timestamp, not a `DateTimeInterface`
        // upstream's `normalize()` can recognize among arbitrary values by type
        // -- there is nothing to `instanceof`-check here, so it is formatted
        // explicitly instead of relying on that recursive detection.
        normalized.datetime = this.formatDate(record.datetime);

        return normalized;
    }

    protected normalize(data: unknown, depth = 0): unknown {
        if (depth > this.maxNormalizeDepth) {
            return `Over ${this.maxNormalizeDepth} levels deep, aborting normalization`;
        }

        if (data === undefined) {
            return undefined;
        }

        if (typeIs(data, "string") || typeIs(data, "boolean")) {
            return data;
        }

        if (typeIs(data, "number")) {
            if (data !== data) {
                return "NaN";
            }

            if (data === math.huge) {
                return "INF";
            }

            if (data === -math.huge) {
                return "-INF";
            }

            return data;
        }

        if (typeIs(data, "table")) {
            // A table with a metatable is a class instance (a Roblox `Instance`,
            // an OOP object elsewhere in this codebase, etc.) rather than plain
            // record data -- there is no PHP object/`Throwable`/`JsonSerializable`
            // system to special-case one against, so it collapses to a string the
            // same way an unrecognized PHP object type would.
            if (getmetatable(data as object) !== undefined) {
                return tostring(data);
            }

            const list = data as Array<unknown>;

            if (list.size() > 0) {
                // `Array<T>.push()` requires `T extends defined` (Luau arrays
                // cannot reliably hold a `nil` mid-list); a normalized value is
                // rarely actually `undefined`, but cast rather than narrow the
                // element type to `unknown`, which `push()` itself rejects.
                const normalized = new Array<defined>();
                let count = 0;

                for (const item of list) {
                    count++;

                    if (count > this.maxNormalizeItemCount) {
                        normalized.push(
                            `Over ${this.maxNormalizeItemCount} items (${list.size()} total), aborting normalization`,
                        );
                        break;
                    }

                    normalized.push(this.normalize(item, depth + 1) as defined);
                }

                return normalized;
            }

            const bag = data as RecordBag;
            const keys = new Array<string>();

            for (const [key] of pairs(bag)) {
                keys.push(tostring(key));
            }

            keys.sort();

            const normalized: RecordBag = {};
            let count = 0;

            for (const key of keys) {
                count++;

                if (count > this.maxNormalizeItemCount) {
                    normalized["..."] =
                        `Over ${this.maxNormalizeItemCount} items (${keys.size()} total), aborting normalization`;
                    break;
                }

                normalized[key] = this.normalize(bag[key], depth + 1);
            }

            return normalized;
        }

        // Function/thread/opaque instance: nothing left to reflect on.
        return tostring(data);
    }

    /** Return the JSON representation of a value. */
    protected toJson(data: unknown): string {
        return Utils.jsonEncode(data, this.prettyPrint);
    }

    protected formatDate(date: number): string {
        return os.date(this.dateFormat, date) as string;
    }

    /**
     * PHP bitflag `json_encode` options have no equivalent when there is no
     * `json_encode` to pass them to -- `toJson()` never consults this set, it
     * exists only so callers ported against the upstream API have somewhere to
     * put a call. Use `setJsonPrettyPrint()` for the one option this port's
     * encoder actually understands.
     */
    private jsonEncodeOptions = new Set<unknown>();

    public addJsonEncodeOption(option: unknown): this {
        this.jsonEncodeOptions.add(option);

        return this;
    }

    public removeJsonEncodeOption(option: unknown): this {
        this.jsonEncodeOptions.delete(option);

        return this;
    }
}
