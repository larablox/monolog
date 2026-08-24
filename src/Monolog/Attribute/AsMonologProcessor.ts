type Constructor = new (...args: Array<unknown>) => object;
type Target = Constructor | object;

/** PHP: `AsMonologProcessor`'s constructor parameters. */
export interface AsMonologProcessorOptions {
    /** The logging channel the processor should be pushed to. */
    channel?: string;

    /** The handler the processor should be pushed to. */
    handler?: string;

    /** The method that processes the records, if the decorator is used at the class level. */
    method?: string;

    /** The priority of the processor so the order can be determined. */
    priority?: number;
}

const REGISTRATIONS = new Map<Target, Array<AsMonologProcessorOptions>>();

/**
 * PHP: `Monolog\Attribute\AsMonologProcessor`.
 *
 * A reusable class-or-method decorator to help configure a class or a method
 * as a processor. Using it offers no guarantee: it needs to be leveraged by a
 * Monolog third-party consumer. Using it with this library alone has no
 * effect at all: processors still need to be turned into a callable and
 * manually pushed to loggers and to processable handlers.
 *
 * PHP's `IS_REPEATABLE` lets the attribute be applied more than once to the
 * same target; there is no attribute system here to grant that, so this
 * stores an array of registrations per decorated target instead of one.
 */
export function AsMonologProcessor(options: AsMonologProcessorOptions = {}) {
    return (target: Target, propertyKey?: string): void => {
        const registration: AsMonologProcessorOptions = {
            channel: options.channel,
            handler: options.handler,
            method: propertyKey ?? options.method,
            priority: options.priority,
        };

        const existing = REGISTRATIONS.get(target) ?? [];
        existing.push(registration);
        REGISTRATIONS.set(target, existing);
    };
}

/** Reads back every registration a class or method was decorated with. */
export function getMonologProcessorRegistrations(
    target: Target,
): Array<AsMonologProcessorOptions> {
    return REGISTRATIONS.get(target) ?? [];
}
