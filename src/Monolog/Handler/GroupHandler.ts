import { Handler } from "Monolog/Handler/Handler";
import { isFormattable } from "Monolog/Handler/FormattableHandlerInterface";
import { isHandler } from "Monolog/Handler/HandlerInterface";
import { isResettable } from "Monolog/ResettableInterface";
import { runProcessor } from "Monolog/Processor/ProcessorInterface";
import type { FormatterInterface } from "Monolog/Formatter/FormatterInterface";
import type { HandlerInterface } from "Monolog/Handler/HandlerInterface";
import type { LogRecord } from "Monolog/LogRecord";
import type { Processor } from "Monolog/Processor/ProcessorInterface";
import type { ProcessableHandlerInterface } from "Monolog/Handler/ProcessableHandlerInterface";
import type { ResettableInterface } from "Monolog/ResettableInterface";

/**
 * PHP: `Monolog\Handler\GroupHandler`. Forwards records to multiple handlers.
 *
 * Upstream gets its processor stack from `ProcessableHandlerTrait`; Luau has
 * no traits, so the trait's members (`processors`, `processRecord()`,
 * `resetProcessors()`, `pushProcessor()`, `popProcessor()`) are spelled out
 * here, the same way `AbstractProcessingHandler` already folds it in.
 */
export class GroupHandler
    extends Handler
    implements ProcessableHandlerInterface, ResettableInterface
{
    protected processors = new Array<Processor>();

    protected handlers: Array<HandlerInterface>;

    protected bubble: boolean;

    /**
     * Upstream's `\InvalidArgumentException` for a non-handler in the array is
     * kept rather than dropped: it is `GroupHandler`'s own explicit check, not
     * PHP's parameter type-check, and this port is consumed from plain Luau
     * too, where TypeScript's `Array<HandlerInterface>` proves nothing. There
     * is no exception class hierarchy on this platform, so it is a plain
     * `error()` carrying upstream's message.
     */
    public constructor(handlers: Array<HandlerInterface>, bubble = true) {
        super();

        for (const handler of handlers) {
            if (!isHandler(handler)) {
                error(
                    "The first argument of the GroupHandler must be an array of HandlerInterface instances.",
                );
            }
        }

        this.handlers = handlers;
        this.bubble = bubble;
    }

    /** Checks whether any of the grouped handlers will handle the record. */
    public isHandling(record: LogRecord): boolean {
        for (const handler of this.handlers) {
            if (handler.isHandling(record)) {
                return true;
            }
        }

        return false;
    }

    /** Handles a record, forwarding a clone of it to every grouped handler. */
    public handle(record: LogRecord): boolean {
        let processed = record;

        if (!this.processors.isEmpty()) {
            processed = this.processRecord(processed);
        }

        for (const handler of this.handlers) {
            handler.handle(processed.clone());
        }

        return this.bubble === false;
    }

    /** Handles a set of records at once. */
    public handleBatch(records: Array<LogRecord>): void {
        let batch = records;

        if (!this.processors.isEmpty()) {
            batch = records.map((record) => this.processRecord(record));
        }

        for (const handler of this.handlers) {
            handler.handleBatch(batch.map((record) => record.clone()));
        }
    }

    /** Adds a processor in the stack. */
    public pushProcessor(processor: Processor): this {
        this.processors.unshift(processor);

        return this;
    }

    /** Removes the processor on top of the stack and returns it. */
    public popProcessor(): Processor | undefined {
        return this.processors.shift();
    }

    /** Processes a record. */
    protected processRecord(record: LogRecord): LogRecord {
        let processed = record;

        for (const processor of this.processors) {
            processed = runProcessor(processor, processed);
        }

        return processed;
    }

    /** Resets any processors on this handler that support resetting. */
    protected resetProcessors(): void {
        for (const processor of this.processors) {
            if (isResettable(processor)) {
                processor.reset();
            }
        }
    }

    /** Resets this handler's processors and every grouped handler. */
    public reset(): void {
        this.resetProcessors();

        for (const handler of this.handlers) {
            if (isResettable(handler)) {
                handler.reset();
            }
        }
    }

    /** Closes every grouped handler. */
    public close(): void {
        super.close();

        for (const handler of this.handlers) {
            handler.close();
        }
    }

    /** Sets the formatter on every grouped handler that supports one. */
    public setFormatter(formatter: FormatterInterface): this {
        for (const handler of this.handlers) {
            if (isFormattable(handler)) {
                handler.setFormatter(formatter);
            }
        }

        return this;
    }
}
