import { Logger } from "Monolog/Logger";
import type { ActivationStrategyInterface } from "Monolog/Handler/FingersCrossed/ActivationStrategyInterface";
import type { Level } from "Monolog/Level";
import type { LogLevel } from "Monolog/LoggerInterface";
import type { LogRecord } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\Handler\FingersCrossed\ErrorLevelActivationStrategy`.
 *
 * Error level based activation strategy.
 */
export class ErrorLevelActivationStrategy implements ActivationStrategyInterface {
    private readonly actionLevel: Level;

    public constructor(actionLevel: Level | LogLevel) {
        this.actionLevel = Logger.toMonologLevel(actionLevel);
    }

    public isHandlerActivated(record: LogRecord): boolean {
        return record.level >= this.actionLevel;
    }
}
