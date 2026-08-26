import type { LogRecord } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\Handler\FingersCrossed\ActivationStrategyInterface`.
 *
 * Interface for activation strategies for the `FingersCrossedHandler`.
 */
export interface ActivationStrategyInterface {
    /** Returns whether the given record activates the handler. */
    isHandlerActivated(record: LogRecord): boolean;
}

/**
 * True when the given value implements `ActivationStrategyInterface`.
 *
 * `FingersCrossedHandler`'s constructor takes either a strategy or a bare
 * level and branches on `instanceof`; there is no `instanceof` for an
 * interface here, so this checks structurally for the one callable member, as
 * `isResettable()` (`ResettableInterface.ts`) already does for its own.
 */
export function isActivationStrategy(
    value: unknown,
): value is ActivationStrategyInterface {
    if (!typeIs(value, "table")) {
        return false;
    }

    const candidate = value as Partial<ActivationStrategyInterface>;

    return typeIs(candidate.isHandlerActivated, "function");
}
