import { Logger } from "Monolog/Logger";
import type { ActivationStrategyInterface } from "Monolog/Handler/FingersCrossed/ActivationStrategyInterface";
import type { Level } from "Monolog/Level";
import type { LogLevel } from "Monolog/LoggerInterface";
import type { LogRecord } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\Handler\FingersCrossed\ChannelLevelActivationStrategy`.
 *
 * Channel and error level based activation strategy. Allows triggering
 * activation based on level per channel: e.g. trigger activation on level
 * `Error` by default, except for records of the `sql` channel, which should
 * trigger activation on level `Warning`.
 *
 * ```ts
 * const activationStrategy = new ChannelLevelActivationStrategy(
 *     Level.Critical,
 *     { request: Level.Alert, sensitive: Level.Error },
 * );
 * const handler = new FingersCrossedHandler(
 *     new RobloxConsoleHandler(),
 *     activationStrategy,
 * );
 * ```
 */
export class ChannelLevelActivationStrategy implements ActivationStrategyInterface {
    private readonly defaultActionLevel: Level;

    private readonly channelToActionLevel = new Map<string, Level>();

    public constructor(
        defaultActionLevel: Level | LogLevel,
        channelToActionLevel: Record<string, Level | LogLevel> = {},
    ) {
        this.defaultActionLevel = Logger.toMonologLevel(defaultActionLevel);

        for (const [channel, level] of pairs(channelToActionLevel)) {
            this.channelToActionLevel.set(
                channel as string,
                Logger.toMonologLevel(level as Level | LogLevel),
            );
        }
    }

    public isHandlerActivated(record: LogRecord): boolean {
        const channelLevel = this.channelToActionLevel.get(record.channel);

        if (channelLevel !== undefined) {
            return record.level >= channelLevel;
        }

        return record.level >= this.defaultActionLevel;
    }
}
