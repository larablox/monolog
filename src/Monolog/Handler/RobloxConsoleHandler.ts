import { AbstractProcessingHandler } from "Monolog/Handler/AbstractProcessingHandler";
import { Level, Levels } from "Monolog/Level";
import { LineFormatter } from "Monolog/Formatter/LineFormatter";
import { Utils } from "Monolog/Utils";
import type { FormatterInterface } from "Monolog/Formatter/FormatterInterface";
import type { LogRecord, RecordBag } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\Handler\PHPConsoleHandler`.
 *
 * Upstream streams debug/error/exception data to the (now abandoned) "PHP
 * Console" Chrome extension via `PhpConsole\Connector`. There is no such
 * target on Roblox, so this adapts the same handler shape -- the `options`
 * bag, the record-kind branching in `write()`, the default formatter -- to
 * the platform's own output console (`print`/`warn`) instead, superseding
 * what the old, not-a-real-upstream-class `ConsoleHandler` used to do.
 */

/**
 * Reduced from upstream's `Options`: everything else there
 * (`classesPartialsTraceIgnore`, `useOwnErrorsHandler`/`useOwnExceptionsHandler`,
 * `sourcesBasePath`, `registerHelper`, `serverEncoding`, `headersLimit`,
 * `password`, `enableSslOnlyMode`, `ipMasks`, `enableEvalListener`, every
 * `dumper*` key, `detectDumpTraceAndSource`, `dataStorage`) is either specific
 * to the PHP Console wire protocol or paired with `ErrorHandler`/`SignalHandler`,
 * both out of scope for this port -- there is no connector object left to
 * configure with them.
 */
export interface Options {
    /** Whether this handler is active at all. */
    enabled: boolean;

    /** Context keys checked, in order, for a debug "tag" to prefix the message with. */
    debugTagsKeysInContext: Array<string>;
}

const DEFAULT_OPTIONS: Options = {
    enabled: true,
    debugTagsKeysInContext: ["tag"],
};

export class RobloxConsoleHandler extends AbstractProcessingHandler {
    private readonly options: Options;

    public constructor(
        options: Partial<Options> = {},
        level: Level = Level.Debug,
        bubble = true,
    ) {
        super(level, bubble);

        this.options = {
            enabled: options.enabled ?? DEFAULT_OPTIONS.enabled,
            debugTagsKeysInContext:
                options.debugTagsKeysInContext ??
                DEFAULT_OPTIONS.debugTagsKeysInContext,
        };
    }

    /** PHP: `PHPConsoleHandler::getOptions()`. */
    public getOptions(): Options {
        return this.options;
    }

    /** PHP: `PHPConsoleHandler::handle()`. */
    public handle(record: LogRecord): boolean {
        if (this.options.enabled) {
            return super.handle(record);
        }

        // Upstream also requires `connector.isActiveClient()` here; there is no
        // connector to ask, so `enabled` is the only gate left.
        return !this.bubble;
    }

    /** PHP: `PHPConsoleHandler::write()`. */
    protected write(record: LogRecord): void {
        if (Levels.isLowerThan(record.level, Level.Notice)) {
            this.writeDebugRecord(record);
        } else if (record.context.exception !== undefined) {
            this.writeExceptionRecord(record);
        } else {
            this.writeErrorRecord(record);
        }
    }

    /** PHP: `PHPConsoleHandler::handleDebugRecord()`. */
    private writeDebugRecord(record: LogRecord): void {
        const [tags, filteredContext] = this.getRecordTags(record);
        let message = record.message;

        if (next(filteredContext)[0] !== undefined) {
            message = `${message} ${Utils.jsonEncode(filteredContext)}`;
        }

        print(`[${tags}] ${message}`);
    }

    /** PHP: `PHPConsoleHandler::handleExceptionRecord()`. */
    private writeExceptionRecord(record: LogRecord): void {
        warn(tostring(record.context.exception));
    }

    /** PHP: `PHPConsoleHandler::handleErrorRecord()`. */
    private writeErrorRecord(record: LogRecord): void {
        const context = record.context;
        const message =
            context.message !== undefined
                ? tostring(context.message)
                : record.message;

        if (context.file === undefined && context.line === undefined) {
            warn(message);

            return;
        }

        const file = context.file !== undefined ? tostring(context.file) : "?";
        const line = context.line !== undefined ? tostring(context.line) : "?";

        warn(`${message} (${file}:${line})`);
    }

    /**
     * PHP: `PHPConsoleHandler::getRecordTags()`. Upstream also checks
     * `$filteredContext[0]`, PHP's implicit first-array-index -- Luau/TS have
     * no positional index on a `RecordBag`, so only the named
     * `debugTagsKeysInContext` keys are checked.
     */
    private getRecordTags(record: LogRecord): [string, RecordBag] {
        const filteredContext: RecordBag = {};

        for (const [key, value] of pairs(record.context)) {
            filteredContext[key as string] = value;
        }

        let tag: string | undefined;

        for (const key of this.options.debugTagsKeysInContext) {
            if (filteredContext[key] !== undefined) {
                tag = tostring(filteredContext[key]);
                delete filteredContext[key];
                break;
            }
        }

        return [tag ?? Levels.toPsrLogLevel(record.level), filteredContext];
    }

    /** PHP: `PHPConsoleHandler::getDefaultFormatter()`. */
    protected getDefaultFormatter(): FormatterInterface {
        return new LineFormatter("%message%");
    }
}
