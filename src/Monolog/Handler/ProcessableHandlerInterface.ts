import type { HandlerInterface } from "Monolog/Handler/HandlerInterface";
import type { Processor } from "Monolog/Processor/ProcessorInterface";

/**
 * PHP: `Monolog\Handler\ProcessableHandlerInterface`.
 *
 * Upstream pairs this with `ProcessableHandlerTrait`, which carries the
 * `$processors` stack and the `processRecord()`/`resetProcessors()` helpers.
 * Luau has no traits, so every implementer in this port spells those members
 * out itself -- `AbstractProcessingHandler`, `GroupHandler` and
 * `FingersCrossedHandler` each carry their own copy, the same way
 * `AbstractProcessingHandler` already folded the trait in before this
 * interface existed.
 */
export interface ProcessableHandlerInterface extends HandlerInterface {
    /** Adds a processor in the stack. */
    pushProcessor(processor: Processor): this;

    /**
     * Removes the processor on top of the stack and returns it.
     *
     * Upstream throws `\LogicException` when the stack is empty; every
     * pop-style method in this port (`Logger.popHandler()`,
     * `AbstractProcessingHandler.popProcessor()`) returns `undefined` instead,
     * and this signature follows them rather than upstream.
     */
    popProcessor(): Processor | undefined;
}
