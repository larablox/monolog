import { NormalizerFormatter } from "Monolog/Formatter/NormalizerFormatter";
import type { LogRecord, RecordBag } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\Formatter\LineFormatter`.
 *
 * The default format drops PHP's trailing newline -- `print` and `warn` add
 * their own.
 *
 * `includeStacktraces`/`indentStacktraces`/`stacktracesParser` are kept for
 * API-shape parity but have nothing to act on: they format PHP's
 * `getTraceAsString()` output, and there is no PHP exception/stack-trace
 * object on this platform for `NormalizerFormatter.normalize()` to have kept
 * a trace from in the first place (see that file's class comment). Setting
 * them changes bookkeeping only, never formatted output.
 *
 * TypeScript can't have a property and a method share a name the way PHP's
 * `$ignoreEmptyContextAndExtra`/`ignoreEmptyContextAndExtra()` (and similarly
 * `allowInlineLineBreaks`, `includeStacktraces`) do -- each such flag's
 * backing field is suffixed (`...Flag`/`...Value`) below; the public method
 * names match upstream exactly.
 */
export class LineFormatter extends NormalizerFormatter {
    public static readonly SIMPLE_FORMAT =
        "[%datetime%] %channel%.%level_name%: %message% %context% %extra%";

    public static readonly SIMPLE_DATE: string = "%Y-%m-%d %H:%M:%S";

    private allowInlineLineBreaksFlag: boolean;
    private ignoreEmptyContextAndExtraFlag: boolean;
    private includeStacktracesFlag = false;
    private indentStacktracesValue = "";
    private stacktracesParser?: (record: LogRecord) => string;
    private maxLevelNameLength?: number;

    public constructor(
        protected readonly format_ = LineFormatter.SIMPLE_FORMAT,
        dateFormat = LineFormatter.SIMPLE_DATE,
        allowInlineLineBreaks = false,
        ignoreEmptyContextAndExtra = false,
        includeStacktraces = false,
    ) {
        super(dateFormat);
        this.allowInlineLineBreaksFlag = allowInlineLineBreaks;
        this.ignoreEmptyContextAndExtraFlag = ignoreEmptyContextAndExtra;
        this.includeStacktraces(includeStacktraces);
    }

    /** Kept for signature parity; there is no PHP trace string to reformat -- see the class comment. */
    public includeStacktraces(
        include = true,
        parser?: (record: LogRecord) => string,
    ): this {
        this.includeStacktracesFlag = include;
        this.stacktracesParser = parser;

        if (this.includeStacktracesFlag) {
            this.allowInlineLineBreaksFlag = true;
        }

        return this;
    }

    /** Kept for signature parity; there is no stack trace here to indent -- see the class comment. */
    public indentStacktraces(indent: string): this {
        this.indentStacktracesValue = indent;

        return this;
    }

    public allowInlineLineBreaks(allow = true): this {
        this.allowInlineLineBreaksFlag = allow;

        return this;
    }

    public ignoreEmptyContextAndExtra(ignore = true): this {
        this.ignoreEmptyContextAndExtraFlag = ignore;

        return this;
    }

    /** Allows cutting the level name to fixed-length levels, e.g. "INF" for "INFO" if set to 3. */
    public setMaxLevelNameLength(maxLevelNameLength?: number): this {
        this.maxLevelNameLength = maxLevelNameLength;

        return this;
    }

    /** Formats a log record. */
    public format(record: LogRecord): string {
        // Upstream calls `parent::format($record)` here for the normalized
        // array; this port's `NormalizerFormatter.format()` returns a JSON
        // *string* instead (see that file's class comment), so the protected
        // `normalizeRecord()` is called directly instead, exactly as upstream's
        // own `JsonFormatter` already does.
        const vars = this.normalizeRecord(record);

        if (this.maxLevelNameLength !== undefined) {
            vars.level_name = (vars.level_name as string).sub(
                1,
                this.maxLevelNameLength,
            );
        }

        let output = this.format_;
        const extra = copyBag(vars.extra as RecordBag);
        const context = copyBag(vars.context as RecordBag);

        for (const [key, value] of pairs(extra)) {
            const placeholder = `%extra.${key}%`;

            if (output.find(placeholder, 1, true)[0] !== undefined) {
                output = output.split(placeholder).join(this.stringify(value));
                delete extra[key as string];
            }
        }

        for (const [key, value] of pairs(context)) {
            const placeholder = `%context.${key}%`;

            if (output.find(placeholder, 1, true)[0] !== undefined) {
                output = output.split(placeholder).join(this.stringify(value));
                delete context[key as string];
            }
        }

        if (this.ignoreEmptyContextAndExtraFlag) {
            if (next(context)[0] === undefined) {
                output = output.split("%context%").join("");
            }

            if (next(extra)[0] === undefined) {
                output = output.split("%extra%").join("");
            }
        }

        vars.context = context;
        vars.extra = extra;

        for (const [key, value] of pairs(vars)) {
            const placeholder = `%${key}%`;

            if (output.find(placeholder, 1, true)[0] !== undefined) {
                output = output.split(placeholder).join(this.stringify(value));
            }
        }

        // Leftover `%extra.xxx%`/`%context.xxx%` placeholders: upstream removes
        // them with a single PCRE alternation; Lua patterns have no `|`
        // alternation, so this is two passes instead of one.
        let [cleaned] = output.gsub("%%extra%.[^%%]-%%", "");
        [cleaned] = cleaned.gsub("%%context%.[^%%]-%%", "");

        return cleaned;
    }

    /**
     * Upstream concatenates records with no separator, relying on
     * `SIMPLE_FORMAT`'s trailing `\n`; this port's `SIMPLE_FORMAT` drops that
     * newline (see the class comment), so records are joined with one instead.
     */
    public formatBatch(records: Array<LogRecord>): string {
        const lines = new Array<string>();

        for (const record of records) {
            lines.push(this.format(record));
        }

        return lines.join("\n");
    }

    public stringify(value: unknown): string {
        return this.replaceNewlines(this.convertToString(value));
    }

    protected convertToString(data: unknown): string {
        if (data === undefined) {
            return "null";
        }

        if (typeIs(data, "boolean")) {
            return data ? "true" : "false";
        }

        if (typeIs(data, "string") || typeIs(data, "number")) {
            return tostring(data);
        }

        return this.toJson(data);
    }

    protected replaceNewlines(str: string): string {
        if (this.allowInlineLineBreaksFlag) {
            // Upstream also unescapes literal `\r`/`\n` sequences inside a
            // JSON-looking string here via a PCRE; there is no PCRE on this
            // platform, so that step is dropped and the string passes through.
            return str;
        }

        let [out] = str.gsub("\r\n", " ");
        [out] = out.gsub("\r", " ");
        [out] = out.gsub("\n", " ");

        return out;
    }
}

/** Shallow-copy a `RecordBag` so `format()` can drop matched placeholder keys without mutating the normalized record. */
function copyBag(bag: RecordBag): RecordBag {
    const copy: RecordBag = {};

    for (const [key, value] of pairs(bag)) {
        copy[key as string] = value;
    }

    return copy;
}
