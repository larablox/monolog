import { ErrorLevelActivationStrategy } from "Monolog/Handler/FingersCrossed/ErrorLevelActivationStrategy";
import { Handler } from "Monolog/Handler/Handler";
import { isActivationStrategy } from "Monolog/Handler/FingersCrossed/ActivationStrategyInterface";
import { isFormattable } from "Monolog/Handler/FormattableHandlerInterface";
import { isHandler } from "Monolog/Handler/HandlerInterface";
import { isResettable } from "Monolog/ResettableInterface";
import { Level, Levels } from "Monolog/Level";
import { Logger } from "Monolog/Logger";
import { runProcessor } from "Monolog/Processor/ProcessorInterface";
import type { ActivationStrategyInterface } from "Monolog/Handler/FingersCrossed/ActivationStrategyInterface";
import type { FormattableHandlerInterface } from "Monolog/Handler/FormattableHandlerInterface";
import type { FormatterInterface } from "Monolog/Formatter/FormatterInterface";
import type { HandlerInterface } from "Monolog/Handler/HandlerInterface";
import type { LogLevel } from "Monolog/LoggerInterface";
import type { LogRecord } from "Monolog/LogRecord";
import type { Processor } from "Monolog/Processor/ProcessorInterface";
import type { ProcessableHandlerInterface } from "Monolog/Handler/ProcessableHandlerInterface";
import type { ResettableInterface } from "Monolog/ResettableInterface";

/**
 * PHP: the `Closure(LogRecord|null, HandlerInterface): HandlerInterface`
 * factory `FingersCrossedHandler` accepts in place of a handler.
 */
export type HandlerFactory = (
    record: LogRecord | undefined,
    handler: FingersCrossedHandler,
) => HandlerInterface;

/**
 * PHP: `Monolog\Handler\FingersCrossedHandler`.
 *
 * Buffers all records until a certain level is reached.
 *
 * The advantage of this approach is that you get no clutter in your log. Only
 * sessions which actually trigger an error (or whatever the
 * `activationStrategy` is) end up in the log, but they contain all records,
 * not only those above the level threshold.
 *
 * There is a `passthruLevel` as well, which means that at the end, even if the
 * handler never got activated, it will still send through log records of at
 * least that level.
 *
 * Upstream gets its processor stack from `ProcessableHandlerTrait`; Luau has
 * no traits, so the trait's members are spelled out here -- see the same note
 * on `GroupHandler` and `AbstractProcessingHandler`.
 */
export class FingersCrossedHandler
    extends Handler
    implements
        ProcessableHandlerInterface,
        ResettableInterface,
        FormattableHandlerInterface
{
    protected processors = new Array<Processor>();

    /** The nested handler, or the factory that will produce it on first use. */
    protected handler: HandlerInterface | HandlerFactory;

    protected activationStrategy: ActivationStrategyInterface;

    protected buffering = true;

    protected bufferSize: number;

    protected buffer = new Array<LogRecord>();

    protected stopBuffering: boolean;

    protected passthruLevel?: Level;

    protected bubble: boolean;

    /**
     * @param handler Handler or factory `(record | undefined, fingersCrossedHandler)`.
     * @param activationStrategy Strategy determining when this handler takes
     *   action, or a level (name or `Level`) at which it is activated.
     * @param bufferSize How many entries to buffer at most; beyond that the
     *   oldest items are removed from the buffer. `0` means unbounded.
     * @param bubble Whether the handled messages can bubble up the stack.
     * @param stopBuffering Whether to stop buffering after being triggered.
     * @param passthruLevel Minimum level to always flush to the nested handler
     *   on close, even if the strategy never triggered.
     */
    public constructor(
        handler: HandlerInterface | HandlerFactory,
        activationStrategy?: Level | LogLevel | ActivationStrategyInterface,
        bufferSize = 0,
        bubble = true,
        stopBuffering = true,
        passthruLevel?: Level | LogLevel,
    ) {
        super();

        let strategy = activationStrategy;

        if (strategy === undefined) {
            strategy = new ErrorLevelActivationStrategy(Level.Warning);
        }

        // Convert a bare level activationStrategy to an object.
        if (!isActivationStrategy(strategy)) {
            strategy = new ErrorLevelActivationStrategy(strategy);
        }

        this.handler = handler;
        this.activationStrategy = strategy;
        this.bufferSize = bufferSize;
        this.bubble = bubble;
        this.stopBuffering = stopBuffering;

        if (passthruLevel !== undefined) {
            this.passthruLevel = Logger.toMonologLevel(passthruLevel);
        }
    }

    /** Always true -- this handler decides what to do with a record later. */
    public isHandling(_record: LogRecord): boolean {
        return true;
    }

    /** Manually activates this handler regardless of the activation strategy. */
    public activate(): void {
        if (this.stopBuffering) {
            this.buffering = false;
        }

        this.getHandler(this.buffer[this.buffer.size() - 1]).handleBatch(
            this.buffer,
        );
        this.buffer = [];
    }

    /** Handles a record, buffering it until the strategy activates. */
    public handle(record: LogRecord): boolean {
        let processed = record;

        if (!this.processors.isEmpty()) {
            processed = this.processRecord(processed);
        }

        if (this.buffering) {
            this.buffer.push(processed);

            if (this.bufferSize > 0 && this.buffer.size() > this.bufferSize) {
                this.buffer.shift();
            }

            if (this.activationStrategy.isHandlerActivated(processed)) {
                this.activate();
            }
        } else {
            this.getHandler(processed).handle(processed);
        }

        return this.bubble === false;
    }

    /** Flushes anything left at the passthru level, then closes the nested handler. */
    public close(): void {
        this.flushBuffer();

        this.getHandler().close();
    }

    /** Resets this handler, its processors, and the nested handler. */
    public reset(): void {
        this.flushBuffer();

        this.resetProcessors();

        const handler = this.getHandler();

        if (isResettable(handler)) {
            handler.reset();
        }
    }

    /**
     * Clears the buffer without flushing any messages down to the wrapped
     * handler. Also resets the handler to its initial buffering state.
     */
    public clear(): void {
        this.buffer = [];
        this.reset();
    }

    /**
     * Resets the state of the handler. Stops forwarding records to the wrapped
     * handler.
     */
    private flushBuffer(): void {
        const passthruLevel = this.passthruLevel;

        if (passthruLevel !== undefined) {
            this.buffer = this.buffer.filter((record) =>
                Levels.includes(passthruLevel, record.level),
            );

            if (!this.buffer.isEmpty()) {
                this.getHandler(
                    this.buffer[this.buffer.size() - 1],
                ).handleBatch(this.buffer);
            }
        }

        this.buffer = [];
        this.buffering = true;
    }

    /**
     * Returns the nested handler.
     *
     * If the handler was provided as a factory, this triggers the handler's
     * instantiation.
     *
     * Upstream's `\RuntimeException` for a factory that returns a non-handler
     * is kept -- there is no exception class hierarchy on this platform, so it
     * is a plain `error()` carrying upstream's message.
     */
    public getHandler(record?: LogRecord): HandlerInterface {
        if (typeIs(this.handler, "function")) {
            const produced = (this.handler as HandlerFactory)(record, this);

            if (!isHandler(produced)) {
                error("The factory Closure should return a HandlerInterface");
            }

            this.handler = produced;
        }

        return this.handler as HandlerInterface;
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

    /**
     * Sets the formatter on the nested handler.
     *
     * Upstream's `\UnexpectedValueException` names the offending class with
     * `get_class()`; `Utils.getClass()` is not ported (see `Utils.ts`), so the
     * name comes from the roblox-ts class metatable's `__tostring` instead.
     */
    public setFormatter(formatter: FormatterInterface): this {
        const handler = this.getHandler();

        if (isFormattable(handler)) {
            handler.setFormatter(formatter);

            return this;
        }

        return error(
            `The nested handler of type ${tostring(getmetatable(handler as object))} does not support formatters.`,
        );
    }

    /** Gets the formatter of the nested handler. */
    public getFormatter(): FormatterInterface {
        const handler = this.getHandler();

        if (isFormattable(handler)) {
            return handler.getFormatter();
        }

        return error(
            `The nested handler of type ${tostring(getmetatable(handler as object))} does not support formatters.`,
        );
    }
}
