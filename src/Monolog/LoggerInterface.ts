/** PHP: the levels `Psr\Log\LogLevel` defines, in ascending severity. */
export type LogLevel =
    | "debug"
    | "info"
    | "notice"
    | "warning"
    | "error"
    | "critical"
    | "alert"
    | "emergency";

/** PHP: `array $context`. */
export type LogContext = Record<string, unknown>;

/**
 * PHP: `Psr\Log\LoggerInterface`.
 *
 * Real Monolog implements this from the separate `psr/log` package, not from
 * `laravel/framework`. There is no Luau port of `psr/log` to depend on
 * instead, so the shape lives here, where the class that actually implements
 * it lives -- `Illuminate\Contracts\Log\Logger` re-exports it rather than
 * declaring its own copy.
 */
export interface LoggerInterface {
    /** System is unusable. */
    emergency(message: unknown, context?: LogContext): void;

    /** Action must be taken immediately. */
    alert(message: unknown, context?: LogContext): void;

    /** Critical conditions. */
    critical(message: unknown, context?: LogContext): void;

    /** Runtime errors that do not require immediate action. */
    error(message: unknown, context?: LogContext): void;

    /** Exceptional occurrences that are not errors. */
    warning(message: unknown, context?: LogContext): void;

    /** Normal but significant events. */
    notice(message: unknown, context?: LogContext): void;

    /** Interesting events. */
    info(message: unknown, context?: LogContext): void;

    /** Detailed debug information. */
    debug(message: unknown, context?: LogContext): void;

    /** Logs with an arbitrary level. */
    log(level: LogLevel, message: unknown, context?: LogContext): void;
}
