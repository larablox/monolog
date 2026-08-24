type Constructor = new (...args: Array<unknown>) => object;

const CHANNELS = new Map<Constructor, string>();

/**
 * PHP: `Monolog\Attribute\WithMonologChannel`.
 *
 * A reusable class decorator to help configure a class as expecting a given
 * logger channel. Using it offers no guarantee: it needs to be leveraged by a
 * Monolog third-party consumer. Using it with this library alone has no
 * effect at all: wiring a logger instance into other classes is not managed
 * by Monolog.
 *
 * PHP attributes are read back through reflection; there is no reflection API
 * on this platform, so the channel is recorded in a module-level map keyed by
 * the decorated class instead, readable back with `getMonologChannel()`.
 */
export function WithMonologChannel(channel: string) {
    return (target: Constructor): void => {
        CHANNELS.set(target, channel);
    };
}

/** Reads back the channel a class was decorated with, if any. */
export function getMonologChannel(target: Constructor): string | undefined {
    return CHANNELS.get(target);
}
