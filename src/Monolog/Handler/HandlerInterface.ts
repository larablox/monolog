import type { LogRecord } from "Monolog/LogRecord";

/** PHP: `Monolog\Handler\HandlerInterface`. */
export interface HandlerInterface {
    /** Checks whether the given record will be handled by this handler. */
    isHandling(record: LogRecord): boolean;

    /** Handles a record. Returning true stops the bubbling chain. */
    handle(record: LogRecord): boolean;

    /** Handles a set of records at once. */
    handleBatch(records: Array<LogRecord>): void;

    /** Closes the handler. */
    close(): void;
}

/**
 * True when the given value implements `HandlerInterface`.
 *
 * PHP checks this with `instanceof` -- `GroupHandler`'s constructor and
 * `FingersCrossedHandler::getHandler()` both reject a non-handler at runtime.
 * There is no `instanceof` for an interface here, so this checks structurally
 * for the four callable members, as `isResettable()`
 * (`ResettableInterface.ts`) already does for its own interface.
 */
export function isHandler(value: unknown): value is HandlerInterface {
    if (!typeIs(value, "table")) {
        return false;
    }

    const candidate = value as Partial<HandlerInterface>;

    return (
        typeIs(candidate.isHandling, "function") &&
        typeIs(candidate.handle, "function") &&
        typeIs(candidate.handleBatch, "function") &&
        typeIs(candidate.close, "function")
    );
}
