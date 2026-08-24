/** PHP: `Monolog\ResettableInterface`. Handlers/processors reset by `Logger::reset()`. */
export interface ResettableInterface {
    reset(): void;
}

/**
 * True when the given value implements `ResettableInterface`.
 *
 * PHP checks this with `instanceof`; Luau/TypeScript have no `instanceof` for
 * interfaces, so this checks structurally for a callable `reset` member instead.
 */
export function isResettable(value: unknown): value is ResettableInterface {
    if (!typeIs(value, "table")) {
        return false;
    }

    return typeIs((value as Partial<ResettableInterface>).reset, "function");
}
