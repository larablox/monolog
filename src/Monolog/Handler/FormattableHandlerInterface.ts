import type { FormatterInterface } from "Monolog/Formatter/FormatterInterface";
import type { HandlerInterface } from "Monolog/Handler/HandlerInterface";

/**
 * PHP: `Monolog\Handler\FormattableHandlerInterface`.
 *
 * Upstream pairs this with `FormattableHandlerTrait`; Luau has no traits, so
 * implementers carry the `$formatter` field and `getDefaultFormatter()`
 * themselves -- see `AbstractProcessingHandler`.
 */
export interface FormattableHandlerInterface extends HandlerInterface {
    /** Sets the formatter. */
    setFormatter(formatter: FormatterInterface): this;

    /** Gets the formatter. */
    getFormatter(): FormatterInterface;
}

/**
 * True when the given value implements `FormattableHandlerInterface`.
 *
 * PHP checks this with `instanceof`; there is no `instanceof` for an
 * interface here, so this checks structurally for the two callable members,
 * exactly as `isResettable()` (`ResettableInterface.ts`) already does.
 */
export function isFormattable(
    value: unknown,
): value is FormattableHandlerInterface {
    if (!typeIs(value, "table")) {
        return false;
    }

    const candidate = value as Partial<FormattableHandlerInterface>;

    return (
        typeIs(candidate.setFormatter, "function") &&
        typeIs(candidate.getFormatter, "function")
    );
}
