import { Level, Levels } from "Monolog/Level";
import { LogRecord } from "Monolog/LogRecord";
import { isResettable } from "Monolog/ResettableInterface";
import { runProcessor } from "Monolog/Processor/ProcessorInterface";
import type { HandlerInterface } from "Monolog/Handler/HandlerInterface";
import type {
    LogContext,
    LogLevel,
    LoggerInterface as LoggerContract,
} from "Monolog/LoggerInterface";
import type { Processor } from "Monolog/Processor/ProcessorInterface";
import type { RecordBag } from "Monolog/LogRecord";
import type { ResettableInterface } from "Monolog/ResettableInterface";

/** PHP: `Closure` passed to `Logger::setExceptionHandler()`. */
export type LoggerExceptionHandler = (
    error: unknown,
    record: LogRecord,
) => void;

/** PHP: `Logger::RFC_5424_LEVELS`, reversed (RFC 5424 number -> Monolog `Level`). */
const RFC_5424_LEVELS = new Map<number, Level>([
    [7, Level.Debug],
    [6, Level.Info],
    [5, Level.Notice],
    [4, Level.Warning],
    [3, Level.Error],
    [2, Level.Critical],
    [1, Level.Alert],
    [0, Level.Emergency],
]);

/**
 * PHP: `Monolog\Logger`.
 *
 * Holds the handler stack and the processor stack, builds a `LogRecord` and
 * walks the handlers until one stops the bubbling chain.
 *
 * Not ported: timezones and microsecond timestamps (`os.time` is what a place
 * has) and the serialization hooks (`__serialize`/`__unserialize`, no PHP
 * magic serialization here). The infinite-logging-loop guard is kept, but
 * keyed by a single instance counter rather than a `Fiber`-keyed `WeakMap` --
 * there is no fiber concept on this platform.
 */
export class Logger implements LoggerContract, ResettableInterface {
    /** The handler stack. */
    protected handlers = new Array<HandlerInterface>();

    /** The processor stack. */
    protected processors = new Array<Processor>();

    /** PHP: `Logger::$exceptionHandler`. */
    protected exceptionHandler?: LoggerExceptionHandler;

    /** PHP: `Logger::$logDepth`. Not fiber-keyed -- see the class comment. */
    private logDepth = 0;

    public constructor(
        protected name: string,
        handlers: Array<HandlerInterface> = [],
        processors: Array<Processor> = [],
    ) {
        this.setHandlers(handlers);

        for (const processor of processors) {
            this.processors.push(processor);
        }
    }

    /** Get the logging channel name. */
    public getName(): string {
        return this.name;
    }

    /** Return a new cloned instance with the name changed. */
    public withName(name: string): Logger {
        return new Logger(name, this.handlers, this.processors);
    }

    /** Pushes a handler on to the stack. */
    public pushHandler(handler: HandlerInterface): this {
        this.handlers.unshift(handler);

        return this;
    }

    /** Pops a handler from the stack. */
    public popHandler(): HandlerInterface | undefined {
        return this.handlers.shift();
    }

    /** Set handlers, replacing all existing ones. */
    public setHandlers(handlers: Array<HandlerInterface>): this {
        this.handlers.clear();

        for (let index = handlers.size() - 1; index >= 0; index--) {
            this.pushHandler(handlers[index]);
        }

        return this;
    }

    /** Get the handler stack. */
    public getHandlers(): Array<HandlerInterface> {
        return this.handlers;
    }

    /** Adds a processor on to the stack. */
    public pushProcessor(processor: Processor): this {
        this.processors.unshift(processor);

        return this;
    }

    /** Removes the processor on top of the stack and returns it. */
    public popProcessor(): Processor | undefined {
        return this.processors.shift();
    }

    /** Get the processor stack. */
    public getProcessors(): Array<Processor> {
        return this.processors;
    }

    /** Adds a log record. */
    public addRecord(
        level: Level | number,
        message: string,
        context: RecordBag = {},
    ): boolean {
        this.logDepth++;
        const handled = this.addRecordAtDepth(
            Logger.remapRFC5424(level),
            message,
            context,
        );
        this.logDepth--;

        return handled;
    }

    /** The loop-depth-checked body of `addRecord`, split out so the counter above always unwinds. */
    private addRecordAtDepth(
        level: Level | LogLevel,
        message: string,
        context: RecordBag,
    ): boolean {
        if (this.logDepth === 3) {
            this.warning(
                "A possible infinite logging loop was detected and aborted. It appears some of your handler code is triggering logging, see the previous log record for a hint as to what may be the cause.",
            );

            return false;
        } else if (this.logDepth >= 5) {
            // log depth 4 is let through, so we can log the warning above
            return false;
        }

        let record = new LogRecord(
            os.time(),
            this.name,
            Logger.toMonologLevel(level),
            message,
            context,
            {},
        );
        let recordInitialized = this.processors.isEmpty();
        let handled = false;

        for (const handler of this.handlers) {
            if (!recordInitialized) {
                // Skip initializing the record as long as no handler will take it.
                if (!handler.isHandling(record)) {
                    continue;
                }

                const [processedOk, processedResult] = pcall(() => {
                    let processed = record;

                    for (const processor of this.processors) {
                        processed = runProcessor(processor, processed);
                    }

                    return processed;
                });

                if (!processedOk) {
                    this.handleException(processedResult, record);

                    return true;
                }

                record = processedResult;
                recordInitialized = true;
            }

            handled = true;

            const [handledOk, handledResult] = pcall(() =>
                handler.handle(record.clone()),
            );

            if (!handledOk) {
                this.handleException(handledResult, record);

                return true;
            }

            if (handledResult === true) {
                break;
            }
        }

        return handled;
    }

    /**
     * PHP: `Logger::toMonologLevel()`. Accepts a Level or a PSR level name.
     *
     * PHP throws `Psr\Log\InvalidArgumentException` for an unrecognized name;
     * there is no port of that exception type, so this throws a plain error
     * with the same message shape instead -- an unrecognized string is a
     * caller bug (a typo'd level from outside TS's own type checking, e.g.
     * deserialized from a string), not something to silently downgrade to
     * `Debug`.
     */
    public static toMonologLevel(level: Level | LogLevel): Level {
        if (!typeIs(level, "string")) {
            return level;
        }

        const found = Levels.fromName(level);

        if (found === undefined) {
            error(
                `Level "${level}" is not defined, use one of: ${Levels.NAMES.join(", ")}`,
            );
        }

        return found;
    }

    /** PHP: `Logger::RFC_5424_LEVELS` remap, applied in `addRecord()`/`log()` before `toMonologLevel()`. */
    private static remapRFC5424(
        level: Level | LogLevel | number,
    ): Level | LogLevel {
        if (typeIs(level, "number") && RFC_5424_LEVELS.has(level)) {
            return RFC_5424_LEVELS.get(level) as Level;
        }

        return level as Level | LogLevel;
    }

    /** Checks whether the Logger has a handler that listens on the given level. */
    public isHandling(level: Level | LogLevel): boolean {
        const record = new LogRecord(
            os.time(),
            this.name,
            Logger.toMonologLevel(level),
            "",
        );

        for (const handler of this.handlers) {
            if (handler.isHandling(record)) {
                return true;
            }
        }

        return false;
    }

    /** Set a custom exception handler called if adding a new record fails. */
    public setExceptionHandler(callback?: LoggerExceptionHandler): this {
        this.exceptionHandler = callback;

        return this;
    }

    /** Get the custom exception handler, if any. */
    public getExceptionHandler(): LoggerExceptionHandler | undefined {
        return this.exceptionHandler;
    }

    /**
     * Delegates exception management to the custom exception handler, or
     * re-raises if no custom handler is set.
     */
    protected handleException(error_: unknown, record: LogRecord): void {
        if (this.exceptionHandler === undefined) {
            error(error_);
        }

        this.exceptionHandler(error_, record);
    }

    /** Ends a log cycle and frees all resources used by handlers. */
    public close(): void {
        for (const handler of this.handlers) {
            handler.close();
        }
    }

    /** Ends a log cycle and resets all handlers and processors that support it. */
    public reset(): void {
        for (const handler of this.handlers) {
            if (isResettable(handler)) {
                handler.reset();
            }
        }

        for (const processor of this.processors) {
            if (isResettable(processor)) {
                processor.reset();
            }
        }
    }

    public emergency(message: unknown, context?: LogContext): void {
        this.addRecord(Level.Emergency, tostring(message), context ?? {});
    }

    public alert(message: unknown, context?: LogContext): void {
        this.addRecord(Level.Alert, tostring(message), context ?? {});
    }

    public critical(message: unknown, context?: LogContext): void {
        this.addRecord(Level.Critical, tostring(message), context ?? {});
    }

    public error(message: unknown, context?: LogContext): void {
        this.addRecord(Level.Error, tostring(message), context ?? {});
    }

    public warning(message: unknown, context?: LogContext): void {
        this.addRecord(Level.Warning, tostring(message), context ?? {});
    }

    public notice(message: unknown, context?: LogContext): void {
        this.addRecord(Level.Notice, tostring(message), context ?? {});
    }

    public info(message: unknown, context?: LogContext): void {
        this.addRecord(Level.Info, tostring(message), context ?? {});
    }

    public debug(message: unknown, context?: LogContext): void {
        this.addRecord(Level.Debug, tostring(message), context ?? {});
    }

    /** Logs with an arbitrary level, named as PSR does. */
    public log(
        level: Level | LogLevel | number,
        message: unknown,
        context?: LogContext,
    ): void {
        this.addRecord(
            Logger.toMonologLevel(Logger.remapRFC5424(level)),
            tostring(message),
            context ?? {},
        );
    }
}
