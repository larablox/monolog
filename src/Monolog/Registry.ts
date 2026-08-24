import type { Logger } from "Monolog/Logger";

/**
 * PHP: `Monolog\Registry`.
 *
 * `__callStatic` (`Registry::api()` reading back as a named accessor) is not
 * ported -- Luau has no magic static-method dispatch. Callers use
 * `Registry.getInstance(name)` explicitly instead.
 */
export class Registry {
    private static loggers = new Map<string, Logger>();

    /** PHP: `Registry::addLogger()`. */
    public static addLogger(
        logger: Logger,
        name?: string,
        overwrite = false,
    ): void {
        const key = name ?? logger.getName();

        if (Registry.loggers.has(key) && !overwrite) {
            error("Logger with the given name already exists");
        }

        Registry.loggers.set(key, logger);
    }

    /** PHP: `Registry::hasLogger()`. */
    public static hasLogger(logger: string | Logger): boolean {
        if (typeIs(logger, "string")) {
            return Registry.loggers.has(logger);
        }

        for (const [, value] of Registry.loggers) {
            if (value === logger) {
                return true;
            }
        }

        return false;
    }

    /** PHP: `Registry::removeLogger()`. */
    public static removeLogger(logger: string | Logger): void {
        if (typeIs(logger, "string")) {
            Registry.loggers.delete(logger);

            return;
        }

        for (const [key, value] of Registry.loggers) {
            if (value === logger) {
                Registry.loggers.delete(key);

                return;
            }
        }
    }

    /** PHP: `Registry::clear()`. */
    public static clear(): void {
        Registry.loggers.clear();
    }

    /** PHP: `Registry::getInstance()`. */
    public static getInstance(name: string): Logger {
        const logger = Registry.loggers.get(name);

        if (logger === undefined) {
            error(`Requested "${name}" logger instance is not in the registry`);
        }

        return logger;
    }
}
